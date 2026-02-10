/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensPartitionLayerState, LensPartitionVisualizationState } from '@kbn/lens-common';
import {
  LENS_LAYER_TYPES,
  PARTITION_EMPTY_SIZE_RADIUS,
  type NumberDisplayType,
  type TypedLensSerializedState,
} from '@kbn/lens-common';
import type { SavedObjectReference } from '@kbn/core/server';
import type {
  PartitionState,
  PartitionStateESQL,
  PartitionStateNoESQL,
} from '../../schema/charts/partition';
import { type LensAttributes } from '../../types';
import type { DataSourceStateLayer } from '../utils';
import {
  buildDatasetStateESQL,
  buildDatasetStateNoESQL,
  buildDatasourceStates,
  generateLayer,
  isFormBasedLayer,
  isTextBasedLayer,
  nonNullable,
  operationFromColumn,
} from '../utils';
import {
  getDatasourceLayers,
  getDataViewsMetadata,
  getSharedChartAPIToLensState,
  getSharedChartLensStateToAPI,
  stripUndefined,
} from './utils';
import { addLayerColumn, groupIsNotCollapsed, isEsqlTableTypeDataset } from '../../utils';
import { fromMetricAPItoLensState } from '../columns/metric';
import { fromBucketLensApiToLensState } from '../columns/buckets';
import { DEFAULT_LAYER_ID } from '../../constants';
import type { PieState } from '../../schema/charts/pie';
import type { WaffleState } from '../../schema/charts/waffle';
import type { MosaicState } from '../../schema/charts/mosaic';
import type { TreemapState } from '../../schema/charts/treemap';
import type { StaticColorType } from '../../schema/color';
import type { CollapseBySchema } from '../../schema/shared';
import { getValueApiColumn, getValueColumn } from '../columns/esql_column';
import {
  fromColorMappingAPIToLensState,
  fromColorMappingLensStateToAPI,
  fromStaticColorLensStateToAPI,
} from '../coloring';

type PartitionLens = Extract<
  TypedLensSerializedState['attributes'],
  { visualizationType: 'lnsPie' }
>;
type PartitionLensState = Omit<PartitionLens['state'], 'filters' | 'query'>;

type PartitionLensWithoutQueryAndFilters = Omit<PartitionLens, 'state'> & {
  state: PartitionLensState;
};

const ACCESSOR = 'partition_value_accessor';

function getAccessorName(type: 'group_by' | 'metric' | 'group_breakdown_by', index: number) {
  return `${ACCESSOR}_${type}_${index}`;
}

function isAPIPartitionLayer(layer: unknown): layer is PartitionState {
  return (
    typeof layer === 'object' &&
    layer !== null &&
    'type' in layer &&
    typeof layer.type === 'string' &&
    ['pie', 'donut', 'waffle', 'treemap', 'mosaic'].includes(layer.type)
  );
}

function isESQLPartitionLayer(layer: PartitionState): layer is PartitionStateESQL {
  return isEsqlTableTypeDataset(layer.dataset);
}

function isAPIPieChartLayer(layer: PartitionState): layer is PieState {
  return layer.type === 'pie' || layer.type === 'donut';
}

function isAPIWaffleChartLayer(layer: PartitionState): layer is WaffleState {
  return layer.type === 'waffle';
}

function isAPIMosaicChartLayer(layer: PartitionState): layer is MosaicState {
  return layer.type === 'mosaic';
}

function isAPITreemapChartLayer(layer: PartitionState): layer is TreemapState {
  return layer.type === 'treemap';
}

function buildFormBasedPartitionLayer(layer: unknown) {
  if (!isAPIPartitionLayer(layer) || isESQLPartitionLayer(layer)) {
    return {};
  }
  const datasource = generateLayer(DEFAULT_LAYER_ID, layer);
  const newLayer = datasource[DEFAULT_LAYER_ID];

  const metricColumns = layer.metrics?.flatMap(fromMetricAPItoLensState) ?? [];
  const metricColumnsWithIds = metricColumns.map((col, index) => ({
    column: col,
    id: getAccessorName('metric', index),
  }));
  const bucketColumns =
    layer.group_by
      ?.map((column) =>
        column ? fromBucketLensApiToLensState(column, metricColumnsWithIds) : undefined
      )
      .filter(nonNullable) ?? [];
  for (const [index, col] of Object.entries(bucketColumns)) {
    addLayerColumn(newLayer, getAccessorName('group_by', Number(index)), col);
  }
  if (isAPIMosaicChartLayer(layer) && layer.group_breakdown_by) {
    const secondaryBucketingColumns =
      layer.group_breakdown_by?.map((column) =>
        fromBucketLensApiToLensState(column, metricColumnsWithIds)
      ) ?? [];
    if (secondaryBucketingColumns.length > 0) {
      for (const [index, col] of Object.entries(secondaryBucketingColumns)) {
        addLayerColumn(newLayer, getAccessorName('group_breakdown_by', Number(index)), col);
      }
    }
  }
  for (const [index, col] of Object.entries(metricColumns)) {
    addLayerColumn(newLayer, getAccessorName('metric', Number(index)), col);
  }

  return newLayer;
}

export function getValueColumns(layer: unknown) {
  if (!isAPIPartitionLayer(layer) || !isESQLPartitionLayer(layer)) {
    return [];
  }

  const esqlMetricColumns =
    layer.metrics?.map((metric, index) =>
      getValueColumn(getAccessorName('metric', index), metric.column, 'number')
    ) ?? [];

  const esqlBucketColumns =
    layer.group_by?.map((bucket, index) =>
      getValueColumn(getAccessorName('group_by', index), bucket.column)
    ) ?? [];
  return esqlMetricColumns.concat(esqlBucketColumns);
}

function convertAPINumberDisplayOption(option: PartitionState['value_display']): {
  numberDisplay: NumberDisplayType;
  percentDecimals?: number;
} {
  const decimals =
    option?.percent_decimals != null ? { percentDecimals: option.percent_decimals } : {};
  if (option?.mode === 'percentage') {
    return { numberDisplay: 'percent', ...decimals };
  }
  if (option?.mode === 'absolute') {
    return { numberDisplay: 'value', ...decimals };
  }
  if (option) {
    return { numberDisplay: option.mode, ...decimals };
  }
  return { numberDisplay: 'percent', ...decimals };
}

function convertAPICategoryDisplayOption(
  option: PieState['label_position']
): PartitionLens['state']['visualization']['layers'][0]['categoryDisplay'] {
  if (option === 'outside') {
    return 'default';
  }
  if (option === 'hidden') {
    return 'hide';
  }
  return option ?? 'default';
}

function convertAPILegendDisplayOption(
  option: PartitionState
): Pick<
  PartitionLens['state']['visualization']['layers'][0],
  'legendDisplay' | 'nestedLegend' | 'legendMaxLines' | 'legendSize' | 'truncateLegend'
> {
  const legend = option?.legend;
  const legendOptions = legend
    ? stripUndefined({
        nestedLegend: 'nested' in legend ? legend?.nested : undefined,
        legendSize: legend?.size,
        legendMaxLines: legend?.truncate_after_lines,
        truncateLegend: legend?.truncate_after_lines != null,
      })
    : {};
  if (legend?.visible === 'auto' || legend?.visible == null) {
    return { legendDisplay: 'default', ...legendOptions };
  }
  return { legendDisplay: legend?.visible, ...legendOptions };
}

function convertAPIStaticColorToLensState(config: PartitionState) {
  if (isAPIMosaicChartLayer(config)) {
    return undefined;
  }
  const colorsByDimension = Object.fromEntries(
    config.metrics
      .filter(hasStaticColorAssignment)
      // @ts-expect-error StaticColorType is ensured by the filter above
      .map((metric, index) => [getAccessorName('metric', index), metric.color.color])
  );
  return Object.keys(colorsByDimension).length > 0 ? { colorsByDimension } : {};
}

function convertCollapseAPItoCollapseFns<P extends 'group_by' | 'group_breakdown_by'>(
  config: Partial<Record<P, { collapse_by?: CollapseBySchema }[]>>,
  prop: P
) {
  if (!(prop in config) || config[prop] == null) {
    return [];
  }
  return config[prop]
    .filter(
      (
        groupBy
      ): groupBy is {
        collapse_by: CollapseBySchema;
      } => groupBy.collapse_by != null
    )
    .map(({ collapse_by }, index) => [getAccessorName(prop, index), collapse_by]);
}

function computeSharedPartitionLayerState(config: PartitionState) {
  const groupColouring = config.group_by?.find(({ color }) => color != null)?.color;
  const hasColorMapping = groupColouring != null && !('type' in groupColouring);
  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: LENS_LAYER_TYPES.DATA,
    ...convertAPINumberDisplayOption(config.value_display),
    ...convertAPILegendDisplayOption(config),
    ...convertAPIStaticColorToLensState(config),
    collapseFns: Object.fromEntries(
      convertCollapseAPItoCollapseFns(config, 'group_by').concat(
        isAPIMosaicChartLayer(config)
          ? convertCollapseAPItoCollapseFns(config, 'group_breakdown_by')
          : []
      )
    ),
    colorMapping: hasColorMapping ? fromColorMappingAPIToLensState(groupColouring) : undefined,
  };
}

function getEmptySizeRatioFromDonutHoleOption(
  option: PieState['donut_hole']
): { emptySizeRatio: number } | {} {
  if (!option || option === 'none') {
    return {};
  }
  const partitionEmptySizeRadiusName =
    option.toUpperCase() as keyof typeof PARTITION_EMPTY_SIZE_RADIUS;
  return { emptySizeRatio: PARTITION_EMPTY_SIZE_RADIUS[partitionEmptySizeRadiusName] };
}

function hasStaticColorAssignment<T extends PartitionState['metrics'][number]>(
  metric: T
): metric is Extract<T, { color: StaticColorType }> {
  return 'color' in metric && metric.color != null && metric.color.type === 'static';
}

function shouldAllowMultipleMetrics(config: PartitionState): boolean {
  return (
    config.metrics.length > 1 ||
    (config.metrics.some(hasStaticColorAssignment) &&
      (config.group_by?.filter(groupIsNotCollapsed).length ?? 0) > 1)
  );
}

function buildVisualizationState(
  config: PartitionState
): PartitionLensWithoutQueryAndFilters['state']['visualization'] {
  const metrics = config.metrics.map((_, index) => getAccessorName('metric', index));
  const primaryGroups = (config.group_by ?? []).map((_, index) =>
    getAccessorName('group_by', index)
  );
  if (isAPIPieChartLayer(config)) {
    return {
      shape: config.type,
      layers: [
        {
          metrics,
          primaryGroups,
          allowMultipleMetrics: shouldAllowMultipleMetrics(config),
          ...computeSharedPartitionLayerState(config),
          categoryDisplay: convertAPICategoryDisplayOption(config.label_position),
          ...getEmptySizeRatioFromDonutHoleOption(config.donut_hole),
        },
      ],
    };
  }

  if (isAPITreemapChartLayer(config)) {
    return {
      shape: config.type,
      layers: [
        {
          metrics,
          primaryGroups,
          allowMultipleMetrics: shouldAllowMultipleMetrics(config),
          ...computeSharedPartitionLayerState(config),
          categoryDisplay: 'default',
        },
      ],
    };
  }

  if (isAPIWaffleChartLayer(config)) {
    return {
      shape: config.type,
      layers: [
        {
          metrics,
          primaryGroups,
          allowMultipleMetrics: shouldAllowMultipleMetrics(config),
          ...computeSharedPartitionLayerState(config),
          categoryDisplay: 'default',
        },
      ],
    };
  }

  if (isAPIMosaicChartLayer(config)) {
    return {
      shape: config.type,
      layers: [
        {
          metrics,
          primaryGroups,
          secondaryGroups:
            config.group_breakdown_by?.map((_, index) =>
              getAccessorName('group_breakdown_by', index)
            ) ?? [],
          // there's no multiple metrics support in mosaic charts
          allowMultipleMetrics: false,
          ...computeSharedPartitionLayerState(config),
          categoryDisplay: 'default',
        },
      ],
    };
  }
  throw new Error('Unsupported partition chart type');
}

export function fromAPItoLensState(config: PartitionState): PartitionLensWithoutQueryAndFilters {
  const { layers, usedDataviews } = buildDatasourceStates(
    config,
    buildFormBasedPartitionLayer,
    getValueColumns
  );

  const { adHocDataViews, internalReferences, references } = getDataViewsMetadata(usedDataviews);

  const visualizationState = buildVisualizationState(config);

  return {
    visualizationType: 'lnsPie',
    ...getSharedChartAPIToLensState(config),
    state: {
      datasourceStates: layers,
      ...(internalReferences.length ? { internalReferences } : {}),
      visualization: visualizationState,
      ...(Object.keys(adHocDataViews).length ? { adHocDataViews } : {}),
    },
    references,
  };
}

export function fromLensStateToAPI(config: LensAttributes): PartitionState {
  const { state } = config;
  const visualizationState = state.visualization as LensPartitionVisualizationState;
  const layers = getDatasourceLayers(state);
  const layer = layers[visualizationState.layers[0].layerId];

  return {
    ...getSharedChartLensStateToAPI(config),
    ...buildVisualizationAPI(
      visualizationState,
      layer,
      config.state.adHocDataViews ?? {},
      config.references,
      config.state.internalReferences ?? []
    ),
  };
}

function convertStateValueDisplayToAPI(
  option: LensPartitionVisualizationState['layers'][0]['numberDisplay']
): NonNullable<PartitionState['value_display']>['mode'] | undefined {
  if (option === 'percent') {
    return 'percentage';
  }
  if (option === 'value') {
    return 'absolute';
  }
  return option;
}

function fromLensStateToSharedPartitionAPI(
  visualization: PartitionLens['state']['visualization']
): Pick<PartitionState, 'legend' | 'value_display'> | undefined {
  const layerState = visualization.layers[0];
  const legend = stripUndefined({
    visible: layerState.legendDisplay === 'default' ? 'auto' : layerState.legendDisplay,
    truncate_after_lines: layerState.legendMaxLines,
    nested: isStateWaffleChart(visualization) ? undefined : layerState.nestedLegend,
    size: layerState.legendSize,
  });
  const valueDisplay = stripUndefined({
    mode: convertStateValueDisplayToAPI(layerState.numberDisplay),
    percent_decimals: layerState.percentDecimals,
  });

  return stripUndefined({
    legend: Object.keys(legend).length > 0 ? legend : undefined,
    value_display: Object.keys(valueDisplay).length > 0 ? valueDisplay : undefined,
  });
}

function fromLensStateToAPIDataset(
  visualization: LensPartitionVisualizationState,
  layer: DataSourceStateLayer,
  adHocDataViews: Record<string, unknown>,
  references: SavedObjectReference[],
  adhocReferences: SavedObjectReference[]
): Pick<PartitionState, 'dataset'> {
  const layerId = visualization.layers[0].layerId;

  if (layer) {
    if (isTextBasedLayer(layer)) {
      return { dataset: buildDatasetStateESQL(layer) as PartitionStateESQL['dataset'] };
    }
    if (isFormBasedLayer(layer)) {
      return {
        dataset: buildDatasetStateNoESQL(
          layer,
          layerId,
          adHocDataViews,
          references,
          adhocReferences
        ) as PartitionState['dataset'],
      };
    }
  }

  throw Error('Dataset type not supported yet');
}

function fromLensStateToAPIMetrics(
  visualization: LensPartitionVisualizationState,
  layer: DataSourceStateLayer
): PartitionState['metrics'] {
  const vizLayer = visualization.layers[0];
  const staticColouring = vizLayer.colorsByDimension;

  if (isTextBasedLayer(layer)) {
    return getMetrics(vizLayer).map(
      (id) =>
        stripUndefined({
          ...getValueApiColumn(id, layer),
          color: staticColouring ? fromStaticColorLensStateToAPI(staticColouring[id]) : undefined,
        }) as PartitionStateESQL['metrics'][0]
    );
  }

  if (!isFormBasedLayer(layer)) {
    throw new Error('Datasource type not supported yet');
  }
  return getMetrics(vizLayer).map(
    (id) =>
      stripUndefined({
        ...operationFromColumn(id, layer),
        color: staticColouring ? fromStaticColorLensStateToAPI(staticColouring[id]) : undefined,
      }) as PartitionStateNoESQL['metrics'][0]
  );
}

// Some integration SOs can have duplicates due to incorrect manual tweaks
function getUniqueIds(array: string[]): string[] {
  return Array.from(new Set(array));
}

// Helper function to overcome the failure of partition chart migrations (found in integration dataset)
function getGroups(vizLayer: LensPartitionVisualizationState['layers'][0]): string[] {
  if ('groups' in vizLayer && Array.isArray(vizLayer.groups)) {
    return getUniqueIds(vizLayer.groups);
  }
  return getUniqueIds(vizLayer.primaryGroups ?? []);
}

// Helper function to overcome the failure of partition chart migrations (found in integration dataset)
function getMetrics(vizLayer: LensPartitionVisualizationState['layers'][0]): string[] {
  if ('metric' in vizLayer && typeof vizLayer.metric === 'string') {
    return [vizLayer.metric];
  }
  return getUniqueIds(vizLayer.metrics);
}

function convertLensStateToAPIGrouping(
  vizLayer: LensPartitionLayerState,
  layer: DataSourceStateLayer,
  groupByAccessors: string[],
  groupIndexForColorMapping: number
) {
  const colorMapping = fromColorMappingLensStateToAPI(vizLayer.colorMapping);
  if (isTextBasedLayer(layer)) {
    return groupByAccessors.map(
      (id, index) =>
        stripUndefined({
          ...getValueApiColumn(id, layer),
          color: index === groupIndexForColorMapping ? colorMapping : undefined,
          collapse_by: vizLayer.collapseFns?.[id] || undefined, // handle gracefully empty strings
        }) as NonNullable<
          Extract<PartitionStateESQL, 'group_breakdown_by'>['group_breakdown_by']
        >[0]
    );
  }
  if (isFormBasedLayer(layer)) {
    return groupByAccessors.map(
      (id, index) =>
        stripUndefined({
          ...operationFromColumn(id, layer),
          color: index === groupIndexForColorMapping ? colorMapping : undefined,
          collapse_by: vizLayer.collapseFns?.[id] || undefined, // handle gracefully empty strings
        }) as NonNullable<
          Extract<PartitionStateNoESQL, 'group_breakdown_by'>['group_breakdown_by']
        >[0]
    );
  }
}

function fromLensStateToAPIGroups(
  visualization: LensPartitionVisualizationState,
  layer: DataSourceStateLayer
): PartitionState['group_by'] {
  const vizLayer = visualization.layers[0];

  const groupByAccessors = getGroups(vizLayer);
  const groupIndexForColorMapping = groupByAccessors.findIndex((id) => !vizLayer.collapseFns?.[id]);
  const groups = convertLensStateToAPIGrouping(
    vizLayer,
    layer,
    groupByAccessors,
    groupIndexForColorMapping
  );
  return groups?.length ? groups : undefined;
}

function fromLensStateToAPISecondaryGroups(
  visualization: LensPartitionVisualizationState,
  layer: DataSourceStateLayer
): Extract<PartitionState, 'group_breakdown_by'> | {} {
  if (!isStateMosaicChart(visualization)) {
    return {};
  }
  const vizLayer = visualization.layers[0];

  const groupByAccessors = vizLayer.secondaryGroups
    ? getUniqueIds(vizLayer.secondaryGroups)
    : undefined;

  return groupByAccessors?.length
    ? { group_breakdown_by: convertLensStateToAPIGrouping(vizLayer, layer, groupByAccessors, -1) }
    : {};
}

function isStatePieChart(
  visualization: LensPartitionVisualizationState
): visualization is LensPartitionVisualizationState & {
  shape: 'pie' | 'donut';
} {
  return visualization.shape === 'pie' || visualization.shape === 'donut';
}

function isStateTreemapChart(
  visualization: LensPartitionVisualizationState
): visualization is LensPartitionVisualizationState & {
  shape: 'treemap';
} {
  return visualization.shape === 'treemap';
}

function isStateMosaicChart(
  visualization: LensPartitionVisualizationState
): visualization is LensPartitionVisualizationState & {
  shape: 'mosaic';
} {
  return visualization.shape === 'mosaic';
}

function isStateWaffleChart(
  visualization: LensPartitionVisualizationState
): visualization is LensPartitionVisualizationState & {
  shape: 'waffle';
} {
  return visualization.shape === 'waffle';
}

function convertStateCategoryDisplayOption(
  categoryDisplay: LensPartitionVisualizationState['layers'][0]['categoryDisplay']
): PieState['label_position'] {
  if (categoryDisplay === 'default') {
    return 'outside';
  }
  if (categoryDisplay === 'hide') {
    return 'hidden';
  }
  return categoryDisplay;
}

function fromLensStateToPerChartSpecificAPI(visualization: LensPartitionVisualizationState) {
  const vizLayer = visualization.layers[0];
  // Pie and Donut chart have the label_position and donut_hole options
  if (isStatePieChart(visualization)) {
    return stripUndefined({
      donut_hole: Object.entries(PARTITION_EMPTY_SIZE_RADIUS)
        .find(([key, value]) => value === vizLayer.emptySizeRatio)?.[0]
        .toLowerCase(),
      label_position: convertStateCategoryDisplayOption(vizLayer.categoryDisplay),
    });
  }

  if (isStateTreemapChart(visualization)) {
    const labelPosition = convertStateCategoryDisplayOption(vizLayer.categoryDisplay);
    return stripUndefined({
      label_position: labelPosition === 'outside' ? undefined : labelPosition,
    });
  }
}

function buildVisualizationAPI(
  visualization: LensPartitionVisualizationState,
  layer: DataSourceStateLayer,
  adHocDataViews: Record<string, unknown>,
  references: SavedObjectReference[],
  adhocReferences: SavedObjectReference[]
): PartitionState {
  return stripUndefined({
    type: visualization.shape,
    metrics: fromLensStateToAPIMetrics(visualization, layer),
    group_by: fromLensStateToAPIGroups(visualization, layer),
    ...fromLensStateToAPISecondaryGroups(visualization, layer),
    ...fromLensStateToAPIDataset(visualization, layer, adHocDataViews, references, adhocReferences),
    ...fromLensStateToSharedPartitionAPI(visualization),
    ...fromLensStateToPerChartSpecificAPI(visualization),
  }) as PartitionState;
}
