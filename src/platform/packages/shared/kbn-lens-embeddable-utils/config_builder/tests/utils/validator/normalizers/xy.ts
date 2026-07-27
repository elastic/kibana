/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { orderBy } from 'lodash';
import type { FormBasedPersistedState } from '@kbn/lens-common';
import type { LensAttributes } from '../../../../types';
import type { NormalizerConfig } from './normalize';
import { mergeNormalizers } from './normalize';
import type { IdRemapping } from './common';
import {
  getCommonNormalizer,
  getColorMappingNormalizer,
  getFormBasedDatasourceState,
} from './common';

// Default colorMappings in Lens state format, mirroring what fromColorMappingAPIToLensState
// produces for DEFAULT_LINE_CATEGORICAL_COLOR_MAPPING and DEFAULT_CATEGORICAL_COLOR_MAPPING.
// `touched` is intentionally omitted — it is covered by COMMON_STATE_IGNORE_PATHS and is stripped
// from the transformed side before comparison, so the original must not carry it either.
const DEFAULT_LINE_COLOR_MAPPING = {
  colorMode: { type: 'categorical' as const },
  paletteId: 'elastic_line_optimized',
  assignments: [] as [],
  specialAssignments: [{ rules: [{ type: 'other' as const }], color: { type: 'loop' as const } }],
};

const DEFAULT_COLOR_MAPPING = {
  colorMode: { type: 'categorical' as const },
  paletteId: 'default',
  assignments: [] as [],
  specialAssignments: [{ rules: [{ type: 'other' as const }], color: { type: 'loop' as const } }],
};

type XYAttributes = Extract<LensAttributes, { visualizationType: 'lnsXY' }>;

// Mirrors seriesTypeFromStateToAPIMap in api_layers.ts
const seriesTypeToAPIType: Record<string, string> = {
  bar: 'bar',
  bar_stacked: 'bar_stacked',
  bar_percentage_stacked: 'bar_percentage',
  bar_horizontal: 'bar_horizontal',
  bar_horizontal_stacked: 'bar_horizontal_stacked',
  bar_horizontal_percentage_stacked: 'bar_horizontal_percentage',
  line: 'line',
  area: 'area',
  area_stacked: 'area_stacked',
  area_percentage_stacked: 'area_percentage',
};

function getAPILayerType(layer: any): string | undefined {
  const { layerType } = layer;
  if (!layerType || layerType === 'data') {
    return seriesTypeToAPIType[layer.seriesType];
  }
  if (layerType === 'referenceLine') return 'reference_lines';
  if (layerType === 'annotations') {
    return layer.persistanceType === 'byReference' ? 'annotation_group' : 'annotations';
  }
  return undefined;
}

function computeLayerRemapping(layers: any[]): IdRemapping {
  return layers.flatMap((layer, i) => {
    const apiType = getAPILayerType(layer);
    return apiType !== undefined ? [[layer.layerId, `${apiType}_${i}`] as [string, string]] : [];
  });
}

function computeColumnRemapping(layers: any[], formBased?: FormBasedPersistedState): IdRemapping {
  const remapping: IdRemapping = [];
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const apiType = getAPILayerType(layer);
    if (apiType === undefined) continue;

    if (!layer.layerType || layer.layerType === 'data') {
      if (layer.xAccessor) remapping.push([layer.xAccessor, `${apiType}_${i}_x`]);
      (layer.accessors ?? []).forEach((acc: string, j: number) => {
        remapping.push([acc, `${apiType}_${i}_y_${j}`]);
        // Include the inner reference column for non-formula reference-based metrics
        // (e.g. the backing max column of a differences metric), mirroring processMetricColumnsWithReferences.
        const fbCol = formBased?.layers?.[layer.layerId]?.columns?.[acc] as any;
        if (
          fbCol &&
          Array.isArray(fbCol.references) &&
          fbCol.references.length > 0 &&
          fbCol.operationType !== 'formula'
        ) {
          remapping.push([fbCol.references[0] as string, `${apiType}_${i}_y_ref_${j}`]);
        }
      });
      if (layer.splitAccessors?.[0])
        remapping.push([layer.splitAccessors[0], `${apiType}_${i}_breakdown`]);
    } else if (layer.layerType === 'referenceLine') {
      (layer.accessors ?? []).forEach((acc: string, j: number) =>
        remapping.push([acc, `reference_lines_${i}_threshold_${j}`])
      );
    }
  }
  return remapping;
}

// Remap viz-layer accessor IDs to match canonical IDs produced by the transform
const alignIds: NormalizerConfig<XYAttributes> = {
  original: (attributes) => {
    const viz = attributes.state.visualization as any;
    const layers: any[] = viz.layers ?? [];

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const apiType = getAPILayerType(layer);
      if (apiType === undefined) continue;

      const canonicalLayerId = `${apiType}_${i}`;

      if (layer.layerType === 'annotations') {
        if (layer.persistanceType === 'byReference') {
          layer.annotationGroupRef = `ref-${canonicalLayerId}`;
        } else {
          // byValue annotation layers: remap event IDs to canonical format
          // Transform uses the base API type (no layer index): "annotations_event_0"
          if (!layer.persistanceType) layer.persistanceType = 'byValue';
          const baseType = canonicalLayerId.replace(/_\d+$/, '');
          (layer.annotations ?? []).forEach((ann: any, j: number) => {
            ann.id = `${baseType}_event_${j}`;
          });
        }
      }

      if (!layer.layerType || layer.layerType === 'data') {
        const accessorMap = new Map<string, string>();
        (layer.accessors ?? []).forEach((acc: string, j: number) =>
          accessorMap.set(acc, `${apiType}_${i}_y_${j}`)
        );

        if (layer.xAccessor) layer.xAccessor = `${apiType}_${i}_x`;
        if (layer.accessors) {
          layer.accessors = layer.accessors.map((_: string, j: number) => `${apiType}_${i}_y_${j}`);
        }
        if (layer.splitAccessors?.length > 0) {
          layer.splitAccessors = [`${apiType}_${i}_breakdown`, ...layer.splitAccessors.slice(1)];
        }
        if (layer.yConfig) {
          layer.yConfig = layer.yConfig.map((yc: any) => ({
            ...yc,
            forAccessor: accessorMap.get(yc.forAccessor) ?? yc.forAccessor,
          }));
        }
      }

      if (layer.layerType === 'referenceLine') {
        if (layer.accessors) {
          layer.accessors = layer.accessors.map(
            (_: string, j: number) => `reference_lines_${i}_threshold_${j}`
          );
        }
        if (layer.yConfig) {
          layer.yConfig = layer.yConfig.map((yc: any, j: number) => {
            const entry = { ...yc, forAccessor: `reference_lines_${i}_threshold_${j}` };
            // "none" is the default fill value — not emitted by the transform
            if (entry.fill === 'none') delete entry.fill;
            return entry;
          });
        }
      }

      layer.layerId = canonicalLayerId;
    }

    return attributes;
  },
};

// Drop/normalize legacy properties and add defaults to match transform output
const alignLegacyTypes: NormalizerConfig<XYAttributes> = {
  original: (attributes) => {
    const viz = attributes.state.visualization as any;
    const layers: any[] = viz.layers ?? [];

    // Collect IDs of viz layers that will be dropped (unknown layerType).
    // Their datasource references are stale after the transform and must be removed.
    const droppedLayerIds = new Set(
      layers
        .filter((layer: any) => getAPILayerType(layer) === undefined)
        .map((layer: any) => layer.layerId as string)
    );

    // Drop layers with unknown layerType (e.g. 'xxx') — the transform skips them
    viz.layers = layers.filter((layer: any) => getAPILayerType(layer) !== undefined);

    for (const layer of viz.layers) {
      if (!layer.layerType || layer.layerType === 'data') {
        delete layer.isHistogram;
        delete layer.simpleView;
        delete layer.xScaleType;
        delete layer.position;
        delete layer.showGridlines;
        // collapseFn: empty string is treated as no collapse by the transform;
        // without a breakdown there is nothing to collapse — transform drops it
        if (layer.collapseFn === '' || !layer.splitAccessors?.length) delete layer.collapseFn;

        // textBased layers use splitAccessor (singular) for breakdown; the transform drops it
        if (layer.splitAccessor) {
          const tbLayer = (attributes.state as any).datasourceStates?.textBased?.layers?.[
            layer.layerId
          ];
          if (tbLayer?.columns) {
            tbLayer.columns = tbLayer.columns.filter(
              (col: any) => col.columnId !== layer.splitAccessor
            );
          }
          delete layer.splitAccessor;
        }

        // colorMapping/palette: only preserved through the round-trip when there's a breakdown.
        // Legacy palette (palette field, no colorMapping) round-trips back as palette, not colorMapping.
        // If colorMapping is present it overrides palette; default colorMapping is only added when
        // neither colorMapping nor palette is set and a breakdown is present.
        if (!layer.splitAccessors?.length) {
          delete layer.colorMapping;
          delete layer.palette;
        } else if (layer.colorMapping) {
          // colorMapping overrides palette in the API round-trip
          delete layer.palette;
        } else if (!layer.palette) {
          // No colorMapping, no palette → the transform always adds a default
          layer.colorMapping =
            layer.seriesType === 'line' ? DEFAULT_LINE_COLOR_MAPPING : DEFAULT_COLOR_MAPPING;
        }
        // If only palette present (legacy) → round-trip preserves palette; leave as-is.

        // Rebuild yConfig: one entry per accessor with normalized axisMode.
        // axisMode 'auto' normalizes to 'left' (the transform treats auto as no-preference → left).
        // Per-series color is dropped when a breakdown is present (color moves to breakdown_by.color).
        const configuredAccessors = new Map<string, any>(
          (layer.yConfig ?? []).map((yc: any) => [yc.forAccessor, yc])
        );
        const allAccessors: string[] = layer.accessors ?? [];
        const hasBreakdown = (layer.splitAccessors?.length ?? 0) > 0;
        layer.yConfig = allAccessors
          .map((acc) => {
            const existing = configuredAccessors.get(acc);
            const rawMode = existing?.axisMode ?? 'left';
            const axisMode = rawMode === 'auto' ? 'left' : rawMode;
            const entry = existing ? { ...existing, axisMode } : { axisMode, forAccessor: acc };
            if (hasBreakdown) delete entry.color;
            // lineStyle/lineWidth are reference-line-only styling; dropped for data layers
            delete entry.lineStyle;
            delete entry.lineWidth;
            return entry;
          })
          .filter((yc: any) => Object.keys(yc).length > 1);
      }
    }

    // Add missing axis visibility/orientation settings with transform defaults
    if (!viz.axisTitlesVisibilitySettings) {
      viz.axisTitlesVisibilitySettings = { x: true, yLeft: true, yRight: true };
    }
    if (!viz.tickLabelsVisibilitySettings) {
      viz.tickLabelsVisibilitySettings = { x: true, yLeft: true, yRight: true };
    }
    if (!viz.gridlinesVisibilitySettings) {
      viz.gridlinesVisibilitySettings = { x: true, yLeft: true, yRight: true };
    }
    if (!viz.labelsOrientation) {
      viz.labelsOrientation = { x: 0, yLeft: 0, yRight: 0 };
    }

    // Determine layer presence for downstream default-filling (after yConfig rebuild above)
    const dataLayers = viz.layers.filter((l: any) => !l.layerType || l.layerType === 'data');
    const hasLines = dataLayers.some((l: any) => l.seriesType === 'line');
    const hasBars = dataLayers.some((l: any) => String(l.seriesType).startsWith('bar'));
    const hasAreas = dataLayers.some((l: any) => String(l.seriesType).startsWith('area'));
    const hasLinesOrAreas = hasLines || hasAreas;
    const hasRightAxisAccessors = dataLayers.some((l: any) =>
      l.yConfig?.some((yc: any) => yc.axisMode === 'right')
    );
    const hasLeftAxisAccessors = dataLayers.some(
      (l: any) =>
        (l.yConfig ?? []).length === 0 || l.yConfig?.some((yc: any) => yc.axisMode !== 'right')
    );

    // preferredSeriesType: always derived from the first data layer's seriesType by the transform
    viz.preferredSeriesType = dataLayers[0]?.seriesType ?? 'bar_stacked';

    // fittingFunction, emphasizeFitting, endValue only preserved for line/area charts
    if (!hasLinesOrAreas) {
      delete viz.fittingFunction;
      delete viz.emphasizeFitting;
      delete viz.endValue;
    }

    // The transform always emits these styling fields (overlays are always present in API output)
    if (viz.hideEndzones == null) viz.hideEndzones = true;
    if (viz.showCurrentTimeMarker == null) viz.showCurrentTimeMarker = false;

    // Series-type-specific styling defaults the transform always emits when the series is present
    if (hasBars && viz.minBarHeight == null) viz.minBarHeight = 1;
    if (!hasBars) {
      delete viz.valueLabels;
    } else if (viz.valueLabels == null || viz.valueLabels === 'hide') {
      viz.valueLabels = 'hide';
    } else {
      viz.valueLabels = 'show';
    }
    if (hasLinesOrAreas) {
      if (viz.pointVisibility == null) viz.pointVisibility = 'auto';
      if (viz.curveType == null) viz.curveType = 'LINEAR';
    } else {
      delete viz.curveType; // curveType only preserved for line/area charts
    }
    if (hasAreas && viz.fillOpacity == null) viz.fillOpacity = 0.3;
    if (!hasAreas) delete viz.fillOpacity; // fillOpacity only preserved for area charts

    // xExtent: X axis only supports fit/custom (full is coerced to fit=dataBounds by the transform)
    if (!viz.xExtent || viz.xExtent.mode === 'full') {
      viz.xExtent = { mode: 'dataBounds', niceValues: false };
    } else {
      if (viz.xExtent.niceValues == null) viz.xExtent.niceValues = false;
    }

    // yLeftExtent: only present when there are left-axis accessors
    if (hasLeftAxisAccessors) {
      if (!viz.yLeftExtent) {
        viz.yLeftExtent = { mode: 'full', niceValues: true };
      } else {
        if (viz.yLeftExtent.niceValues == null) viz.yLeftExtent.niceValues = true;
      }
    } else {
      delete viz.yLeftExtent;
    }

    // yRightExtent: only present when there are right-axis accessors
    if (hasRightAxisAccessors) {
      if (!viz.yRightExtent) {
        viz.yRightExtent = { mode: 'full', niceValues: true };
      } else {
        if (viz.yRightExtent.niceValues == null) viz.yRightExtent.niceValues = true;
      }
    } else {
      delete viz.yRightExtent;
    }

    // Scale defaults: the transform emits 'linear' for each present axis
    if (hasLeftAxisAccessors && viz.yLeftScale == null) viz.yLeftScale = 'linear';
    if (!hasLeftAxisAccessors) delete viz.yLeftScale;
    if (hasRightAxisAccessors && viz.yRightScale == null) viz.yRightScale = 'linear';
    if (!hasRightAxisAccessors) delete viz.yRightScale;

    // When there are no right-axis accessors the transform uses y2=undefined → defaults for yRight
    if (!hasRightAxisAccessors) {
      if (viz.axisTitlesVisibilitySettings) viz.axisTitlesVisibilitySettings.yRight = true;
      if (viz.tickLabelsVisibilitySettings) viz.tickLabelsVisibilitySettings.yRight = true;
      if (viz.gridlinesVisibilitySettings) viz.gridlinesVisibilitySettings.yRight = true;
      if (viz.labelsOrientation) viz.labelsOrientation.yRight = 0;
    }

    // yLeftTitle is a legacy alias for yTitle; the transform always uses yTitle
    if (viz.yLeftTitle != null && !viz.yTitle) viz.yTitle = viz.yLeftTitle;
    delete viz.yLeftTitle;

    // Axis titles are stripped when visibility is false or string is empty or no axis exists
    if (!viz.yTitle || viz.axisTitlesVisibilitySettings?.yLeft === false) delete viz.yTitle;
    if (!viz.xTitle || viz.axisTitlesVisibilitySettings?.x === false) delete viz.xTitle;
    // yRightTitle is also dropped when there are no right-axis accessors (no y2 axis built)
    if (
      !viz.yRightTitle ||
      viz.axisTitlesVisibilitySettings?.yRight === false ||
      !hasRightAxisAccessors
    ) {
      delete viz.yRightTitle;
    }

    // Legend normalizations
    const legend = viz.legend;
    if (legend) {
      // Compute isInsideLegend BEFORE deleting isInside: false (mirrors isLegendInside() in legend.ts)
      const isInsideLegend =
        legend.isInside === true ||
        (legend.isInside == null &&
          legend.legendSize == null &&
          (legend.floatingColumns != null ||
            legend.verticalAlignment != null ||
            legend.horizontalAlignment != null));

      // isVisible is always emitted; missing = false (API round-trip: no isVisible → 'hidden' → false)
      if (legend.isVisible == null) legend.isVisible = false;
      // showSingleSeries is only emitted when visibility === 'auto', which requires isVisible === true
      if (legend.isVisible === false || legend.showSingleSeries === false)
        delete legend.showSingleSeries;
      // Empty legendStats array is not preserved through the round-trip
      if (Array.isArray(legend.legendStats) && !legend.legendStats.length)
        delete legend.legendStats;
      // isInside: false is never emitted — outside legends have no isInside field
      if (legend.isInside === false) delete legend.isInside;

      if (isInsideLegend) {
        // Inside legends always get position: 'right' and default top/right alignment
        legend.position = 'right';
        if (legend.verticalAlignment == null) legend.verticalAlignment = 'top';
        if (legend.horizontalAlignment == null) legend.horizontalAlignment = 'right';
      } else {
        // Outside legends: strip inside-only fields and legendSize for horizontal positions
        delete legend.horizontalAlignment;
        delete legend.verticalAlignment;
        delete legend.floatingColumns;
        if (legend.position === 'top' || legend.position === 'bottom') delete legend.legendSize;
      }
      // maxLines is always emitted as 1 for grid-layout (non-list) legends
      if (legend.layout !== 'list' && legend.maxLines == null) legend.maxLines = 1;
      // "auto" is not a valid XYLegendSize in the API schema — the round-trip drops it
      if (legend.legendSize === 'auto') delete legend.legendSize;
    }

    // Delete empty linkToLayers from formBased layers
    const formBased = attributes.state.datasourceStates.formBased;
    if (formBased) {
      for (const layer of Object.values(formBased.layers)) {
        const l = layer as any;
        if (Array.isArray(l.linkToLayers) && l.linkToLayers.length === 0) {
          delete l.linkToLayers;
        }
      }

      // Remove datasource layers with empty columns — result of dropped invalid viz layers
      for (const [layerId, layer] of Object.entries(formBased.layers)) {
        if (Object.keys((layer as any).columns ?? {}).length === 0) {
          delete formBased.layers[layerId];
        }
      }
    }

    // Clean up properties stripped by the transform
    if (formBased) {
      // Build a set of "backing reference" column IDs (y_ref backing columns for non-formula metrics).
      // The transform drops timeScale from these sub-columns — they never surface in the API.
      const referencedColIds = new Set<string>();
      for (const layer of Object.values(formBased.layers)) {
        for (const col of Object.values((layer as any).columns ?? {})) {
          const refs = (col as any).references;
          if (Array.isArray(refs)) refs.forEach((r: string) => referencedColIds.add(r));
        }
      }

      for (const layer of Object.values(formBased.layers)) {
        for (const col of Object.values((layer as any).columns ?? {})) {
          const c = col as any;
          // isStaticValue is a runtime-only marker not emitted by the transform
          delete c.isStaticValue;
          // static_value backing columns are not preserved through the API round-trip
          if (c.operationType === 'static_value' && Array.isArray(c.references)) {
            c.references = [];
          }
          // null/empty values for these optional properties are treated as absent by the transform
          if (c.filter === null || c.filter === '') delete c.filter;
          if (c.reducedTimeRange === null || c.reducedTimeRange === '') delete c.reducedTimeRange;
          if (c.timeScale === null) delete c.timeScale;
          if (c.timeShift === null) delete c.timeShift;
          // formula columns: filters without a language field are malformed and dropped by the transform
          if (
            c.operationType === 'formula' &&
            c.filter != null &&
            typeof c.filter === 'object' &&
            !c.filter.language
          ) {
            delete c.filter;
          }
        }
      }

      // Backing reference columns (y_ref): the transform drops timeScale for these
      for (const layer of Object.values(formBased.layers)) {
        for (const [colId, col] of Object.entries((layer as any).columns ?? {})) {
          if (referencedColIds.has(colId)) delete (col as any).timeScale;
        }
      }
    }

    // Convert TSVB-style adhoc data view IDs in internalReferences:
    // tsvb_ad_hoc_{index}/{timeField} → {index}-{timeField}  (matches generateAdHocDataViewId output)
    if (attributes.state.internalReferences?.length) {
      attributes.state.internalReferences = attributes.state.internalReferences.map((ref) => {
        if (
          ref.type === 'index-pattern' &&
          typeof ref.id === 'string' &&
          ref.id.startsWith('tsvb_ad_hoc_')
        ) {
          const suffix = ref.id.slice('tsvb_ad_hoc_'.length);
          const slashIdx = suffix.lastIndexOf('/');
          if (slashIdx !== -1) {
            return { ...ref, id: `${suffix.slice(0, slashIdx)}-${suffix.slice(slashIdx + 1)}` };
          }
        }
        return ref;
      });
      // Sort to match the order the transformed side produces
      attributes.state.internalReferences = orderBy(attributes.state.internalReferences, [
        'name',
        'id',
        'type',
      ]);
    }

    // Remove references for dropped viz layers (their datasource refs are stale).
    if (droppedLayerIds.size > 0) {
      attributes.references = attributes.references.filter(
        (ref) => !droppedLayerIds.has(ref.name.replace('indexpattern-datasource-layer-', ''))
      );
    }

    // Tag references (type: "tag") are not preserved by the transform — drop them.
    attributes.references = attributes.references.filter((ref) => ref.type !== 'tag');

    // External index-pattern refs with raw index-pattern IDs (e.g. "logs-*") that match
    // an adHocDataViews entry are treated as adhoc by the transform and dropped from external refs.
    const adHocDataViews = (attributes.state as any).adHocDataViews as
      | Record<string, { name?: string }>
      | undefined;
    if (adHocDataViews) {
      const adhocNames = new Set(
        Object.values(adHocDataViews)
          .map((v) => v?.name)
          .filter(Boolean)
      );
      attributes.references = attributes.references.filter(
        (ref) => !(ref.type === 'index-pattern' && adhocNames.has(ref.id))
      );
    }

    // Annotation layers store their data view ref as xy-visualization-layer-{layerId}.
    // Some original states use indexpattern-datasource-layer-{layerId} instead — convert those.
    const annotationLayerIds = new Set(
      (viz.layers as any[])
        .filter((l: any) => l.layerType === 'annotations')
        .map((l: any) => l.layerId as string)
    );
    attributes.references = attributes.references.map((ref) => {
      if (ref.type === 'index-pattern' && ref.name.startsWith('indexpattern-datasource-layer-')) {
        const layerId = ref.name.replace('indexpattern-datasource-layer-', '');
        if (annotationLayerIds.has(layerId)) {
          return { ...ref, name: `xy-visualization-layer-${layerId}` };
        }
      }
      return ref;
    });

    // Re-sort so the order matches what normalizeReferences produces on the transformed side.
    attributes.references = orderBy(attributes.references, ['name', 'id', 'type']);

    return attributes;
  },

  transformed: (attributes) => {
    // buildReferenceLineLayer always emits undefined-valued properties (fill, icon, etc.)
    // in yConfig entries. Strip them so the comparison with the original succeeds.
    const viz = attributes.state.visualization as any;
    for (const layer of viz.layers ?? []) {
      if (layer.yConfig) {
        layer.yConfig = layer.yConfig.map((yc: any) => {
          const cleaned: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(yc)) {
            if (v !== undefined) cleaned[k] = v;
          }
          return cleaned;
        });
      }
    }

    // "auto" legendSize is not a valid API value — drop it from transformed too so the
    // comparison is symmetric regardless of whether original also carried it.
    const legend = viz.legend as any;
    if (legend?.legendSize === 'auto') delete legend.legendSize;

    // The transform adds an empty kuery filter to annotation events — drop it when empty
    for (const layer of viz.layers ?? []) {
      if (layer.layerType === 'annotations') {
        for (const ann of layer.annotations ?? []) {
          if (ann.filter != null && typeof ann.filter === 'object' && ann.filter.query === '') {
            delete ann.filter;
          }
        }
      }
    }

    // Sort internalReferences to match the sorted order produced on the original side
    if (attributes.state.internalReferences?.length) {
      attributes.state.internalReferences = orderBy(attributes.state.internalReferences, [
        'name',
        'id',
        'type',
      ]);
    }

    return attributes;
  },
};

export const normalizeXY = mergeNormalizers<XYAttributes>(
  [
    getCommonNormalizer<XYAttributes>(({ state: { visualization, datasourceStates } }) => ({
      layerRemapping: computeLayerRemapping((visualization as any).layers ?? []),
      columnRemapping: computeColumnRemapping(
        (visualization as any).layers ?? [],
        getFormBasedDatasourceState(datasourceStates)
      ),
    })),
    alignIds,
    alignLegacyTypes,
    getColorMappingNormalizer<XYAttributes>('state.visualization.layers.*.colorMapping'),
  ],
  // ES|QL column format params differ between original and transform output
  ['state.datasourceStates.textBased.layers.*.columns.*.params']
);
