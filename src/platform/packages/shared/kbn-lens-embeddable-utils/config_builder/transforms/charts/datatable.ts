/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type {
  FormBasedLayer,
  FormBasedPersistedState,
  DatatableVisualizationState,
  PersistedIndexPatternLayer,
  TextBasedLayer,
  TypedLensSerializedState,
  ColumnState,
} from '@kbn/lens-common';
import { LENS_DATAGRID_DENSITY, LENS_ROW_HEIGHT_MODE } from '@kbn/lens-common';
import type { SavedObjectReference } from '@kbn/core/server';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { LEGACY_SINGLE_ROW_HEIGHT_MODE } from '@kbn/lens-common/visualizations/datatable/constants';
import type {
  DatatableState,
  DatatableStateESQL,
  DatatableStateNoESQL,
  LensApiAllOperations,
} from '../../schema';
import type { LensAttributes } from '../../types';
import { DEFAULT_LAYER_ID } from '../../types';
import {
  addLayerColumn,
  buildDatasetStateESQL,
  buildDatasetStateNoESQL,
  buildDatasourceStates,
  buildReferences,
  generateApiLayer,
  generateLayer,
  getAdhocDataviews,
  isFormBasedLayer,
  isTextBasedLayer,
  operationFromColumn,
} from '../utils';
import { getValueApiColumn, getValueColumn } from '../columns/esql_column';
import {
  fromColorMappingAPIToLensState,
  fromColorByValueAPIToLensState,
  fromColorByValueLensStateToAPI,
  fromColorMappingLensStateToAPI,
} from '../coloring';
import { fromMetricAPItoLensState } from '../columns/metric';
import { fromBucketLensApiToLensState } from '../columns/buckets';
import {
  getDatasourceLayers,
  getLensStateLayer,
  getSharedChartAPIToLensState,
  getSharedChartLensStateToAPI,
} from './utils';
import { isAPIColumnOfBucketType, isAPIColumnOfMetricType } from '../columns/utils';
import type { AnyMetricLensStateColumn } from '../columns/types';

const ACCESSOR = 'datatable_accessor';
const METRIC_ACCESSOR_PREFIX = 'metric';
const ROW_ACCESSOR_PREFIX = 'row';
const SPLIT_METRIC_BY_ACCESSOR_PREFIX = 'split_metric_by';

function getAccessorName(
  type: 'metric' | 'row' | 'split_metric_by' | 'metric_ref',
  index?: number
) {
  if (index == null) {
    return `${ACCESSOR}_${type}`;
  }
  return `${ACCESSOR}_${type}_${index}`;
}

function buildCommonMetricRowState(
  config: DatatableState['metrics'][number] | NonNullable<DatatableState['rows']>[number]
): Pick<ColumnState, 'hidden' | 'alignment' | 'colorMode' | 'isTransposed'> {
  return {
    ...(config.visible !== undefined ? { hidden: !config.visible } : {}),
    ...(config.alignment ? { alignment: config.alignment } : {}),
    ...(config.apply_color_to
      ? config.apply_color_to === 'value'
        ? { colorMode: 'text' }
        : { colorMode: 'cell' }
      : {}),
    isTransposed: false,
  };
}

function buildMetricsState(metrics: DatatableState['metrics']): ColumnState[] {
  return metrics.map((metric, index) => {
    const columnId = getAccessorName(METRIC_ACCESSOR_PREFIX, index);

    return {
      columnId,
      ...buildCommonMetricRowState(metric),
      ...(metric.color && metric.apply_color_to
        ? { palette: fromColorByValueAPIToLensState(metric.color) }
        : {}),
      ...(metric.summary
        ? {
            summaryRow: metric.summary.type,
            ...(metric.summary.label ? { summaryLabel: metric.summary.label } : {}),
          }
        : {}),
      isMetric: true,
    };
  });
}

function buildRowsState(rows: DatatableState['rows']): ColumnState[] {
  if (!rows) return [];

  return rows.map((row, index) => {
    const columnId = getAccessorName(ROW_ACCESSOR_PREFIX, index);
    return {
      columnId,
      ...buildCommonMetricRowState(row),
      ...(row.color && row.apply_color_to
        ? { colorMapping: fromColorMappingAPIToLensState(row.color) }
        : {}),
      ...(row.click_filter !== undefined ? { oneClickFilter: row.click_filter } : {}),
      ...(row.collapse_by ? { collapseFn: row.collapse_by } : {}),
      isMetric: false,
    };
  });
}

function buildSplitMetricsByState(splitMetrics: DatatableState['split_metrics_by']): ColumnState[] {
  if (!splitMetrics) return [];

  return splitMetrics.map((_splitMetricBy, index) => {
    const columnId = getAccessorName(SPLIT_METRIC_BY_ACCESSOR_PREFIX, index);
    return {
      columnId,
      isMetric: false,
      isTransposed: true,
    };
  });
}

function getSortingColumnId(sorting: NonNullable<DatatableState['sorting']>): string | undefined {
  switch (sorting.by) {
    case 'metric':
      return getAccessorName(METRIC_ACCESSOR_PREFIX, sorting.index);
    case 'row':
      return getAccessorName(ROW_ACCESSOR_PREFIX, sorting.index);
    case 'split_metrics_by': {
      const metricColumnId = getAccessorName(METRIC_ACCESSOR_PREFIX, sorting.metric_index);
      return `${sorting.values.join('---')}---${metricColumnId}`;
    }
    default:
      return undefined;
  }
}

function buildSortingState(config: DatatableState): Pick<DatatableVisualizationState, 'sorting'> {
  if (!config.sorting) {
    return {};
  }

  const columnId = getSortingColumnId(config.sorting);
  if (!columnId) {
    return {};
  }

  return {
    sorting: {
      columnId,
      direction: config.sorting.direction,
    },
  };
}

function buildVisualizationState(config: DatatableState): DatatableVisualizationState {
  const metrics = buildMetricsState(config.metrics);
  const rows = buildRowsState(config.rows);
  const splitMetrics = buildSplitMetricsByState(config.split_metrics_by);

  return {
    layerId: DEFAULT_LAYER_ID,
    layerType: 'data',
    ...(config.density?.height?.header
      ? config.density?.height?.header?.type === 'auto'
        ? { headerRowHeight: LENS_ROW_HEIGHT_MODE.auto }
        : {
            headerRowHeight: LENS_ROW_HEIGHT_MODE.custom,
            headerRowHeightLines: config.density?.height?.header?.max_lines,
          }
      : {}),
    ...(config.density?.height?.value
      ? config.density?.height?.value?.type === 'auto'
        ? { rowHeight: LENS_ROW_HEIGHT_MODE.auto }
        : {
            rowHeight: LENS_ROW_HEIGHT_MODE.custom,
            rowHeightLines: config.density?.height?.value?.lines,
          }
      : {}),
    ...(config.density?.mode
      ? config.density?.mode === 'compact'
        ? { density: LENS_DATAGRID_DENSITY.COMPACT }
        : config.density?.mode === 'expanded'
        ? { density: LENS_DATAGRID_DENSITY.EXPANDED }
        : { density: LENS_DATAGRID_DENSITY.NORMAL }
      : {}),
    ...(config.paging ? { paging: { size: config.paging, enabled: true } } : {}),
    ...buildSortingState(config),
    columns: metrics.concat(rows, splitMetrics),
  };
}

type APIMetricRowCommonProps = Partial<
  Pick<DatatableState['metrics'][number], 'visible' | 'alignment'>
>;

function buildCommonMetricRowProps(column: ColumnState): APIMetricRowCommonProps {
  return {
    ...(column.hidden !== undefined ? { visible: !column.hidden } : {}),
    ...(column.alignment ? { alignment: column.alignment } : {}),
  };
}

type APIMetricProps = APIMetricRowCommonProps &
  Partial<Pick<DatatableState['metrics'][number], 'apply_color_to' | 'color' | 'summary'>>;

function buildMetricsAPI(column: ColumnState): APIMetricProps {
  const { summaryRow, summaryLabel, colorMode, palette } = column;
  return {
    ...buildCommonMetricRowProps(column),
    ...(colorMode && colorMode !== 'none'
      ? {
          apply_color_to: colorMode === 'text' ? 'value' : 'background',
          ...(palette ? { color: fromColorByValueLensStateToAPI(palette) } : {}),
        }
      : {}),
    ...(summaryRow && summaryRow !== 'none'
      ? { summary: { type: summaryRow, ...(summaryLabel ? { label: summaryLabel } : {}) } }
      : {}),
  };
}

type APIRowProps = APIMetricRowCommonProps &
  Partial<
    Pick<
      NonNullable<DatatableState['rows']>[number],
      'apply_color_to' | 'color' | 'collapse_by' | 'click_filter'
    >
  >;

function buildRowsAPI(column: ColumnState): APIRowProps {
  const { collapseFn, oneClickFilter, colorMode, colorMapping } = column;
  return {
    ...buildCommonMetricRowProps(column),
    ...(colorMode && colorMode !== 'none'
      ? {
          apply_color_to: colorMode === 'text' ? 'value' : 'background',
          ...(colorMapping ? { color: fromColorMappingLensStateToAPI(colorMapping) } : {}),
        }
      : {}),
    ...(collapseFn ? { collapse_by: collapseFn } : {}),
    ...(oneClickFilter !== undefined ? { click_filter: oneClickFilter } : {}),
  };
}

/**
 * In metric columns the isMetric is not set in all cases and neither is for rows
 * - For formBasedLayers: pass apiOperation to distinguish bucket (row) vs metric operations
 * - For textBased: don't pass apiOperation and rely on column state only
 */
const isMetricColumn = (col: ColumnState, apiOperation?: LensApiAllOperations) => {
  if (apiOperation && isAPIColumnOfBucketType(apiOperation)) {
    return false;
  }
  return ('isMetric' in col && col.isMetric) || (!('isMetric' in col) && !col.isTransposed);
};

type DatatableColumnsNoESQL = Pick<
  DatatableStateNoESQL,
  'metrics' | 'rows' | 'split_metrics_by' | 'sorting'
>;
type DatatableColumnsESQL = Pick<
  DatatableStateESQL,
  'metrics' | 'rows' | 'split_metrics_by' | 'sorting'
>;

function convertDatatableColumnsToAPI(
  layer: Omit<FormBasedLayer, 'indexPatternId'>,
  visualization: DatatableVisualizationState
): DatatableColumnsNoESQL;
function convertDatatableColumnsToAPI(
  layer: TextBasedLayer,
  visualization: DatatableVisualizationState
): DatatableColumnsESQL;
function convertDatatableColumnsToAPI(
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer,
  visualization: DatatableVisualizationState
): DatatableColumnsNoESQL | DatatableColumnsESQL {
  const { columns } = visualization;
  if (columns.length === 0) {
    throw new Error('Datatable must have at least one metric column');
  }

  if (isFormBasedLayer(layer)) {
    const metrics: DatatableStateNoESQL['metrics'] = [];
    const rows: NonNullable<DatatableStateNoESQL['rows']> = [];
    const splitMetricsBy: NonNullable<DatatableStateNoESQL['split_metrics_by']> = [];

    for (const column of columns) {
      const { columnId } = column;
      const apiOperation = columnId ? operationFromColumn(columnId, layer) : undefined;
      if (!apiOperation) throw new Error('Column not found');

      if (isMetricColumn(column, apiOperation)) {
        if (!isAPIColumnOfMetricType(apiOperation))
          throw new Error('Metric column must be a metric operation');
        metrics.push({
          ...apiOperation,
          ...buildMetricsAPI(column),
        });
      } else if (column.isTransposed) {
        if (!isAPIColumnOfBucketType(apiOperation))
          throw new Error('Split metric column must be a bucket operation');
        splitMetricsBy.push(apiOperation);
      } else {
        if (!isAPIColumnOfBucketType(apiOperation))
          throw new Error('Row column must be a bucket operation');
        rows.push({
          ...apiOperation,
          ...buildRowsAPI(column),
        });
      }
    }

    return {
      metrics,
      ...(rows.length > 0 ? { rows } : {}),
      ...(splitMetricsBy.length > 0 ? { split_metrics_by: splitMetricsBy } : {}),
    };
  }

  const metrics: DatatableStateESQL['metrics'] = [];
  const rows: NonNullable<DatatableStateESQL['rows']> = [];
  const splitMetricsBy: NonNullable<DatatableStateESQL['split_metrics_by']> = [];

  for (const column of columns) {
    const { columnId } = column;
    const apiOperation = columnId ? getValueApiColumn(columnId, layer) : undefined;
    if (!apiOperation) throw new Error('Column not found');

    if (isMetricColumn(column)) {
      metrics.push({
        ...apiOperation,
        ...buildMetricsAPI(column),
      });
    } else if (column.isTransposed) {
      splitMetricsBy.push(apiOperation);
    } else {
      rows.push({ ...apiOperation, ...buildRowsAPI(column) });
    }
  }

  return {
    metrics,
    ...(rows.length > 0 ? { rows } : {}),
    ...(splitMetricsBy.length > 0 ? { split_metrics_by: splitMetricsBy } : {}),
  };
}

function parseColumnIndex(columnId: string, prefix: string): number | undefined {
  if (!columnId.startsWith(prefix)) {
    return undefined;
  }
  const index = parseInt(columnId.slice(prefix.length), 10);
  return isNaN(index) ? undefined : index;
}

function parseSplitMetricsBySorting(
  columnId: string,
  metricColumnIds: (string | undefined)[]
): { values: string[]; metricIndex: number } | undefined {
  // Format: value1---value2---...---metricColumnId
  const parts = columnId.split('---');
  if (parts.length < 2) {
    return undefined;
  }

  const metricColumnId = parts[parts.length - 1];
  const metricIndex = metricColumnIds.indexOf(metricColumnId);
  if (metricIndex === -1) {
    return undefined;
  }

  return {
    values: parts.slice(0, -1),
    metricIndex,
  };
}

function parseSortingToAPI(
  sorting: DatatableVisualizationState['sorting'],
  columns: ColumnState[]
): DatatableState['sorting'] | undefined {
  if (!sorting?.columnId || sorting.direction === 'none') {
    return;
  }

  const { columnId, direction } = sorting;

  // Split_metrics_by sorting (contains ---)
  if (columnId.includes('---')) {
    const metricColumnIds = columns.filter((col) => isMetricColumn(col)).map((col) => col.columnId);

    const parsed = parseSplitMetricsBySorting(columnId, metricColumnIds);
    return parsed
      ? {
          by: 'split_metrics_by',
          metric_index: parsed.metricIndex,
          values: parsed.values,
          direction,
        }
      : undefined;
  }

  // Metric column sorting
  const metricIndex = parseColumnIndex(columnId, `${getAccessorName(METRIC_ACCESSOR_PREFIX)}_`);
  if (metricIndex !== undefined) {
    return { by: 'metric', index: metricIndex, direction };
  }

  // Row column sorting
  const rowIndex = parseColumnIndex(columnId, `${getAccessorName(ROW_ACCESSOR_PREFIX)}_`);
  if (rowIndex !== undefined) {
    return { by: 'row', index: rowIndex, direction };
  }

  return;
}

function parseDensityToAPI(
  visualization: Pick<
    DatatableVisualizationState,
    'density' | 'rowHeight' | 'rowHeightLines' | 'headerRowHeight' | 'headerRowHeightLines'
  >
): DatatableState['density'] | undefined {
  const { rowHeight, headerRowHeight, density, rowHeightLines, headerRowHeightLines } =
    visualization;

  if (!rowHeight && !headerRowHeight && !density && !rowHeightLines && !headerRowHeightLines) {
    return;
  }

  const height: Record<string, unknown> = {};
  const isLegacySingleMode = (heightMode: string) => heightMode === LEGACY_SINGLE_ROW_HEIGHT_MODE;
  const getHeightMode = (heightMode?: string) =>
    heightMode
      ? isLegacySingleMode(heightMode)
        ? LENS_ROW_HEIGHT_MODE.custom
        : heightMode
      : LENS_ROW_HEIGHT_MODE.custom;

  if (rowHeight || rowHeightLines) {
    // Handle legacy 'single' row height mode by mapping it to 'custom'
    const isLegacyRowHeight = rowHeight ? isLegacySingleMode(rowHeight) : false;
    const heightMode = getHeightMode(rowHeight);
    const shouldIncludeLines =
      (heightMode === LENS_ROW_HEIGHT_MODE.custom && rowHeightLines) || isLegacyRowHeight;
    height.value = {
      type: heightMode,
      ...(shouldIncludeLines ? { lines: rowHeightLines ?? 1 } : {}),
    };
  }

  if (headerRowHeight || headerRowHeightLines) {
    // Handle legacy 'single' header row height mode by mapping it to 'custom'
    const isLegacyHeaderRowHeight = headerRowHeight ? isLegacySingleMode(headerRowHeight) : false;
    const heightMode = getHeightMode(headerRowHeight);
    const shouldIncludeMaxLines =
      (heightMode === LENS_ROW_HEIGHT_MODE.custom && headerRowHeightLines) ||
      isLegacyHeaderRowHeight;
    height.header = {
      type: heightMode,
      ...(shouldIncludeMaxLines ? { max_lines: headerRowHeightLines ?? 1 } : {}),
    };
  }

  return {
    ...(density ? { mode: density === LENS_DATAGRID_DENSITY.NORMAL ? 'default' : density } : {}),
    ...(Object.keys(height).length > 0 ? { height } : {}),
  };
}

function convertAppearanceToAPIFormat(
  visualization: DatatableVisualizationState
): Pick<DatatableState, 'density' | 'paging' | 'sorting'> {
  const { paging, sorting, columns } = visualization;

  const densityAPI = parseDensityToAPI(visualization);
  const sortingAPI = parseSortingToAPI(sorting, columns);

  const isValidPagingSize = (size: number): size is 10 | 20 | 30 | 50 | 100 => {
    return [10, 20, 30, 50, 100].includes(size);
  };

  return {
    ...(densityAPI ? { density: densityAPI } : {}),
    ...(paging && paging.enabled
      ? { paging: isValidPagingSize(paging.size) ? paging.size : 10 }
      : {}),
    ...(sortingAPI ? { sorting: sortingAPI } : {}),
  };
}

function buildVisualizationAPI(
  visualization: DatatableVisualizationState,
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer,
  layerId: string,
  adHocDataViews: Record<string, DataViewSpec>,
  references: SavedObjectReference[],
  adhocReferences?: SavedObjectReference[]
): DatatableState {
  if (isTextBasedLayer(layer)) {
    const dataset = buildDatasetStateESQL(layer);

    return {
      type: 'datatable',
      dataset,
      ...generateApiLayer(layer),
      ...convertAppearanceToAPIFormat(visualization),
      ...convertDatatableColumnsToAPI(layer, visualization),
    };
  }

  const dataset = buildDatasetStateNoESQL(
    layer,
    layerId,
    adHocDataViews,
    references,
    adhocReferences
  );
  return {
    type: 'datatable',
    dataset,
    ...generateApiLayer(layer),
    ...convertAppearanceToAPIFormat(visualization),
    ...convertDatatableColumnsToAPI(layer, visualization),
  };
}

function buildFormBasedLayer(config: DatatableStateNoESQL): FormBasedPersistedState['layers'] {
  const layers: Record<string, PersistedIndexPatternLayer> = generateLayer(
    DEFAULT_LAYER_ID,
    config
  );
  const defaultLayer = layers[DEFAULT_LAYER_ID];

  // First, convert ALL metrics and collect them with their IDs
  const metricsConverted = config.metrics.map(fromMetricAPItoLensState);
  const allMetricColumnsWithIds: Array<{ column: AnyMetricLensStateColumn; id: string }> = [];

  for (const [index, convertedColumns] of metricsConverted.entries()) {
    const [mainMetric, refMetric] = convertedColumns;
    const id = getAccessorName(METRIC_ACCESSOR_PREFIX, index);
    allMetricColumnsWithIds.push({ column: mainMetric, id });

    if (refMetric) {
      // Reference columns need a different ID format
      const refId = getAccessorName(`${METRIC_ACCESSOR_PREFIX}_ref`, index);
      // Rewrite the main metric's reference to match the new ID
      if ('references' in mainMetric && Array.isArray(mainMetric.references)) {
        mainMetric.references = [refId];
      }
      allMetricColumnsWithIds.push({ column: refMetric, id: refId });
    }
  }

  // Add row columns
  if (config.rows) {
    config.rows.forEach((row, index) => {
      const bucketColumn = fromBucketLensApiToLensState(row, allMetricColumnsWithIds);
      addLayerColumn(defaultLayer, getAccessorName(ROW_ACCESSOR_PREFIX, index), bucketColumn, true);
    });
  }

  // Add split_metrics_by columns
  if (config.split_metrics_by) {
    config.split_metrics_by.forEach((splitBy, index) => {
      const bucketColumn = fromBucketLensApiToLensState(splitBy, allMetricColumnsWithIds);
      addLayerColumn(
        defaultLayer,
        getAccessorName(SPLIT_METRIC_BY_ACCESSOR_PREFIX, index),
        bucketColumn,
        true
      );
    });
  }

  for (const { id, column } of allMetricColumnsWithIds) {
    addLayerColumn(defaultLayer, id, column);
  }

  return layers;
}

function getValueColumns(config: DatatableStateESQL) {
  return [
    ...config.metrics.map((metric, index) =>
      getValueColumn(getAccessorName(METRIC_ACCESSOR_PREFIX, index), metric.column, 'number')
    ),
    ...(config.rows ?? []).map((row, index) =>
      getValueColumn(getAccessorName(ROW_ACCESSOR_PREFIX, index), row.column, 'number')
    ),
    ...(config.split_metrics_by ?? []).map((splitBy, index) =>
      getValueColumn(
        getAccessorName(SPLIT_METRIC_BY_ACCESSOR_PREFIX, index),
        splitBy.column,
        'number'
      )
    ),
  ];
}

type DatatableAttributes = Extract<
  TypedLensSerializedState['attributes'],
  { visualizationType: 'lnsDatatable' }
>;

type DatatableAttributesWithoutFiltersAndQuery = Omit<DatatableAttributes, 'state'> & {
  state: Omit<DatatableAttributes['state'], 'filters' | 'query'>;
};

export function fromAPItoLensState(
  config: DatatableState
): DatatableAttributesWithoutFiltersAndQuery {
  const _buildDataLayer = (cfg: unknown, i: number) =>
    buildFormBasedLayer(cfg as DatatableStateNoESQL);

  const { layers, usedDataviews } = buildDatasourceStates(config, _buildDataLayer, getValueColumns);

  const visualization = buildVisualizationState(config);

  const { adHocDataViews, internalReferences } = getAdhocDataviews(usedDataviews);
  const regularDataViews = Object.values(usedDataviews).filter(
    (v): v is { id: string; type: 'dataView' } => v.type === 'dataView'
  );
  const references = regularDataViews.length
    ? buildReferences({ [DEFAULT_LAYER_ID]: regularDataViews[0]?.id })
    : [];

  return {
    visualizationType: 'lnsDatatable',
    ...getSharedChartAPIToLensState(config),
    references,
    state: {
      datasourceStates: layers,
      internalReferences,
      visualization,
      adHocDataViews: config.dataset.type === 'index' ? adHocDataViews : {},
    },
  };
}

export function fromLensStateToAPI(config: LensAttributes): DatatableState {
  const { state } = config;
  const visualization = state.visualization as DatatableVisualizationState;
  const layers = getDatasourceLayers(state);
  const [layerId, layer] = getLensStateLayer(layers, visualization.layerId);

  const visualizationState = {
    ...getSharedChartLensStateToAPI(config),
    ...buildVisualizationAPI(
      visualization,
      layer,
      layerId ?? DEFAULT_LAYER_ID,
      config.state.adHocDataViews ?? {},
      config.references,
      config.state.internalReferences
    ),
  };

  return visualizationState;
}
