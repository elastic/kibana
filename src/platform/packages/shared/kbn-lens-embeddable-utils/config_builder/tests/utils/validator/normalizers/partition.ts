/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PARTITION_EMPTY_SIZE_RADIUS,
  type LensPartitionVisualizationState,
} from '@kbn/lens-common';
import type { ColorMapping } from '@kbn/coloring';
import {
  DEFAULT_CATEGORICAL_COLOR_MAPPING,
  fromColorMappingAPIToLensState,
} from '../../../../transforms/coloring';
import type { LensAttributes } from '../../../../types';
import type { NormalizerConfig } from './normalize';
import { mergeNormalizers } from './normalize';
import type { IdRemapping } from './common';
import { DEFAULT_LAYER_ID, getColorMappingNormalizer, getCommonNormalizer } from './common';
import type { AccessorType } from '../../../../transforms/charts/partition';
import { getAccessorName, getGroups, getMetrics } from '../../../../transforms/charts/partition';

type PartitionAttributes = Extract<LensAttributes, { visualizationType: 'lnsPie' }>;
type PartitionLayer = LensPartitionVisualizationState['layers'][number];

// Legacy partition SOs persisted the singular `metric` / `groups` fields instead
// of `metrics` / `primaryGroups`. The transform tolerates both via `getMetrics`
// / `getGroups`; reuse the same helpers here so the normalizer stays in sync
// with the canonical legacy-detection logic and we don't crash on undefined
// arrays.
function getColumnRemapping({ layers }: LensPartitionVisualizationState): IdRemapping {
  const layer = layers[0];
  if (!layer) return [];

  const remap = (ids: string[] | undefined, type: AccessorType): IdRemapping =>
    (ids ?? []).map((id, index) => [id, getAccessorName(type, index)]);

  return [
    ...remap(getMetrics(layer), 'metric'),
    ...remap(getGroups(layer), 'group_by'),
    ...remap(layer.secondaryGroups, 'group_breakdown_by'),
  ];
}

function remapAccessors(ids: string[], idMap: Map<string, string>): string[] {
  return ids.map((id) => idMap.get(id) ?? id);
}

// Remap the keys of a record to the new accessor ids
function remapRecordKeys<T>(
  record: Record<string, T>,
  idMap: Map<string, string>
): Record<string, T> | undefined {
  const result: Record<string, T> = {};
  for (const [key, value] of Object.entries(record)) {
    result[idMap.get(key) ?? key] = value;
  }
  return result;
}

const alignId: NormalizerConfig<PartitionAttributes> = {
  original: (attributes) => {
    const viz = attributes.state.visualization;
    const layer = viz.layers[0];
    if (!layer) return attributes;

    const columnRemapping = getColumnRemapping(viz);
    const idMap = new Map(
      columnRemapping.filter((pair): pair is [string, string] => pair[0] != null)
    );

    // Canonicalize legacy `metric` (string) / `groups` (array) onto the `metrics` / `primaryGroups` fields
    const legacyLayer = layer as PartitionLayer & { metric?: string; groups?: string[] };
    layer.metrics = getMetrics(layer);
    layer.primaryGroups = getGroups(layer);
    delete legacyLayer.metric;
    delete legacyLayer.groups;

    layer.layerId = DEFAULT_LAYER_ID;
    layer.metrics = remapAccessors(layer.metrics, idMap);
    layer.primaryGroups = remapAccessors(layer.primaryGroups, idMap);
    if (layer.secondaryGroups) {
      layer.secondaryGroups = remapAccessors(layer.secondaryGroups, idMap);
    }

    if (layer.collapseFns) {
      layer.collapseFns = remapRecordKeys(layer.collapseFns, idMap);
    }

    if (layer.colorsByDimension) {
      layer.colorsByDimension = remapRecordKeys(layer.colorsByDimension, idMap);
    }

    return attributes;
  },
};

const alignLegacyTypes: NormalizerConfig<PartitionAttributes> = {
  original: (attributes) => {
    const viz = attributes.state.visualization;
    const layer = viz.layers[0];
    if (!layer) return attributes;

    // allowMultipleMetrics can be undefined -> default to false
    layer.allowMultipleMetrics = layer.allowMultipleMetrics ?? false;

    // colorMapping/ palette can be undefined -> default to the transformation of DEFAULT_CATEGORICAL_COLOR_MAPPING when there is grouping by
    const hasColorDefined = layer.colorMapping !== undefined || viz.palette !== undefined;
    if (layer.primaryGroups.length > 0 && !hasColorDefined) {
      layer.colorMapping = (
        fromColorMappingAPIToLensState(DEFAULT_CATEGORICAL_COLOR_MAPPING) as {
          colorMapping: ColorMapping.Config;
        }
      ).colorMapping;
    }

    // truncateLegend can be undefined -> default to false
    layer.truncateLegend = layer.truncateLegend ?? false;

    // emptySizeRatio can be undefined for donut charts -> runtime defaults to SMALL donut hole
    const validDonutHoleSizes = Object.values(PARTITION_EMPTY_SIZE_RADIUS) as number[];
    if (
      viz.shape === 'donut' &&
      (layer.emptySizeRatio === undefined ||
        (layer.emptySizeRatio !== 0 && !validDonutHoleSizes.includes(layer.emptySizeRatio)))
    ) {
      layer.emptySizeRatio = PARTITION_EMPTY_SIZE_RADIUS.SMALL;
    }

    // emptySizeRatio can be 0 for donut charts -> runtime renders a pie chart
    if (viz.shape === 'donut' && layer.emptySizeRatio === 0) {
      delete layer.emptySizeRatio;
      viz.shape = 'pie';
    }

    // emptySizeRatio is not supported for non-donut charts -> delete it
    if (viz.shape !== 'donut' && layer.emptySizeRatio !== undefined) {
      delete layer.emptySizeRatio;
    }

    // Drop viz.palette from the original whenever the runtime doesn't use it:
    // - viz.palette is null
    // - layer.colorMapping is defined
    if (viz.palette == null || layer.colorMapping !== undefined) {
      delete viz.palette;
    }

    // `palettetemplate` doesn't appear anywhere in the partition visualization schema
    // (appears only in one probably hand-edited SO)
    if ('palettetemplate' in viz) {
      delete (viz as Record<string, unknown>).palettetemplate;
    }

    // legendStats is not supported for non-waffle charts -> delete it
    if (viz.shape !== 'waffle' && 'legendStats' in layer) {
      delete layer.legendStats;
    }

    // When `legendStats` is undefined (legacy saved objects), values are shown by default
    // (matching the rendering behavior in `getLegendStats`)
    if (viz.shape === 'waffle' && layer.legendStats == null) {
      layer.legendStats = ['value'];
    }

    // legendMaxLines is ignored at runtime when truncateLegend is false or undefined -> delete it
    if (!layer.truncateLegend) {
      delete layer.legendMaxLines;
    }

    // legendMaxLines defaults to 1 when truncateLegend is true
    if (layer.truncateLegend && layer.legendMaxLines == null) {
      layer.legendMaxLines = 1;
    }

    // if chart has only collapsed primary groups, colorMapping and palette should be ignored -> delete it
    // TODO: Currently for Mosaic if a SO has no uncollapsed primary groups but has uncollapsed secondary groups,
    // the colorMapping and palette are not ignored. This should be fixed at runtime.
    const allPrimariesCollapsed =
      layer.primaryGroups.length > 0 &&
      layer.primaryGroups.every((id) => Boolean(layer.collapseFns?.[id]));
    const noPrimaries = layer.primaryGroups.length === 0;
    if (noPrimaries || allPrimariesCollapsed) {
      delete layer.colorMapping;
      delete viz.palette;
    }

    return attributes;
  },
};

const clearEmptySecondaryGroups: NormalizerConfig<PartitionAttributes> = {
  original: (attributes) => {
    const viz = attributes.state.visualization;
    const layer = viz.layers[0];
    if (!layer) return attributes;

    if (layer.secondaryGroups?.length === 0 || layer.secondaryGroups == null) {
      delete layer.secondaryGroups;
    }

    return attributes;
  },
};

const clearEmptyCollapseFns: NormalizerConfig<PartitionAttributes> = {
  original: (attributes) => {
    const viz = attributes.state.visualization;
    const layer = viz.layers[0];
    if (!layer) {
      return attributes;
    }

    for (const [key, value] of Object.entries(layer.collapseFns ?? {})) {
      if (!layer.collapseFns) continue;
      if (!value) {
        // empty string collapseFns are undefined -> delete it
        delete layer.collapseFns[key];
      }
    }

    if (Object.keys(layer.collapseFns ?? {}).length === 0) {
      delete layer.collapseFns;
    }

    return attributes;
  },
};

export const normalizePartition = mergeNormalizers<PartitionAttributes>(
  [
    getCommonNormalizer<PartitionAttributes>(({ state: { visualization } }) => ({
      layerRemapping: [[visualization.layers[0]?.layerId, DEFAULT_LAYER_ID]],
      columnRemapping: getColumnRemapping(visualization),
    })),
    alignId,
    clearEmptySecondaryGroups,
    clearEmptyCollapseFns,
    alignLegacyTypes,
    getColorMappingNormalizer<PartitionAttributes>('state.visualization.layers.*.colorMapping'),
  ],
  [
    // Re-apply at the end of the chain because alignLegacyTypes may inject a
    // default colorMapping (with touched: false) after the common normalizer's
    // ignore pass has already run.
    'state.visualization.layers.*.colorMapping.assignments.*.touched',
    'state.visualization.layers.*.colorMapping.specialAssignments.*.touched',
  ]
);
