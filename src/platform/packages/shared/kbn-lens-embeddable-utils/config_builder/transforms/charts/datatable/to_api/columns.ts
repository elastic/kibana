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
  DatatableVisualizationState,
  TextBasedLayer,
  ColumnState,
  CellDecorationFillConfig,
} from '@kbn/lens-common';
import type { PaletteOutput } from '@kbn/coloring';
import type {
  DatatableConfig,
  DatatableConfigESQL,
  DatatableConfigNoESQL,
} from '../../../../schema';
import { isFormBasedLayer, operationFromColumn } from '../../../utils';
import { getValueApiColumn } from '../../../columns/esql_column';
import {
  AUTO_COLOR,
  fromColorByValueLensStateToAPI,
  fromColorMappingLensStateToAPI,
} from '../../../coloring';
import { isAPIColumnOfBucketType, isAPIColumnOfMetricType } from '../../../columns/utils';
import { isMetricColumnESQL, isMetricColumnNoESQL, colorModeToApplyColorTo } from '../helpers';
import { stripUndefined } from '../../utils';

type APIMetric = NonNullable<DatatableConfig['metrics']>[number];

type APIMetricRowCommonProps = Partial<Pick<APIMetric, 'visible' | 'alignment' | 'width'>>;

type APIClassicColorProps = Partial<
  Pick<Exclude<APIMetric, { apply_color_to: 'progress_bar' }>, 'apply_color_to' | 'color'>
>;

function buildCommonMetricRowProps(column: ColumnState): APIMetricRowCommonProps {
  return stripUndefined<APIMetricRowCommonProps>({
    visible: column.hidden != null ? !column.hidden : undefined,
    alignment: column.alignment,
    width: column.width,
  });
}

type ProgressBarColumn = Extract<
  NonNullable<DatatableConfigESQL['metrics']>[number],
  { apply_color_to: 'progress_bar' }
>;

type DistributivePick<T, K extends PropertyKey> = T extends unknown
  ? Pick<T, Extract<keyof T, K>>
  : never;

type ProgressBarFillProps = DistributivePick<ProgressBarColumn, 'fill_mode' | 'color'>;

type ProgressBarProps = Pick<ProgressBarColumn, 'apply_color_to' | 'value_range' | 'alignment'> &
  ProgressBarFillProps;

type PaletteFillColor = Extract<ProgressBarColumn, { fill_mode: 'solid' | 'gradient' }>['color'];

function buildValueRange({
  valueRange,
}: CellDecorationFillConfig): ProgressBarColumn['value_range'] {
  // The editor always stores both custom bounds. Only a hand-edited range can miss one
  return valueRange?.mode === 'custom' &&
    valueRange.min !== undefined &&
    valueRange.max !== undefined
    ? { type: 'custom', min: valueRange.min, max: valueRange.max }
    : { type: 'auto' };
}

function buildPaletteFillColor(palette: ColumnState['palette']): PaletteFillColor {
  if (!palette) {
    return AUTO_COLOR;
  }
  // The editor's seed palette has no params until the user edits it, and renders as a distributed palette.
  return (
    fromColorByValueLensStateToAPI(palette.params ? palette : { ...palette, params: {} }) ??
    AUTO_COLOR
  );
}

function buildFillProps(
  { fillMode, color }: CellDecorationFillConfig,
  palette: ColumnState['palette']
): ProgressBarFillProps {
  switch (fillMode) {
    case 'single':
      return {
        fill_mode: fillMode,
        color: color !== undefined ? { type: 'static', color } : AUTO_COLOR,
      };
    case 'solid':
    case 'gradient':
      return { fill_mode: fillMode, color: buildPaletteFillColor(palette) };
  }
}

/**
 * Values kept for another fill mode (the palette behind a single fill, the color behind a palette
 * fill, custom bounds while the range is `auto`) are editor memory rather than chart configuration,
 * so they are dropped.
 */
function buildProgressBarProps({
  fillStyle,
  palette,
  alignment,
}: ColumnState): ProgressBarProps | undefined {
  // The editor always seeds `fillStyle` together with the progress decoration.
  if (!fillStyle) {
    return;
  }

  return {
    apply_color_to: 'progress_bar',
    value_range: buildValueRange(fillStyle),
    // The editor leaves the alignment unset, which renders `right`.
    alignment: alignment === 'left' ? 'left' : 'right',
    ...buildFillProps(fillStyle, palette),
  } satisfies ProgressBarProps;
}

/**
 * Build the color props for a metric column or an esql row.
 * - If the column has a progress bar → output the progress bar props
 * - If colorMapping is present → output colorMapping
 * - If palette is present → output colorByValue
 */
export function buildColorProps(column: ColumnState): APIClassicColorProps | ProgressBarProps {
  const { colorMode, palette, colorMapping } = column;
  if (!colorMode || colorMode === 'none') return {};

  const applyColorTo = colorModeToApplyColorTo(colorMode);
  if (applyColorTo === 'progress_bar') {
    return buildProgressBarProps(column) ?? {};
  }

  // Prefer colorMapping if present, otherwise use palette
  if (colorMapping) {
    return {
      apply_color_to: applyColorTo,
      color: fromColorMappingLensStateToAPI(colorMapping),
    };
  }

  if (palette) {
    return {
      apply_color_to: applyColorTo,
      color: palette.params
        ? fromColorByValueLensStateToAPI(palette)
        : // Intentional `as PaletteOutput` type assertion as the legacy palette export bridge accepts palettes with opaque params.
          fromColorMappingLensStateToAPI(undefined, palette as PaletteOutput), // support for legacy palettes
    };
  }

  return { apply_color_to: applyColorTo, color: AUTO_COLOR };
}

type APIMetricProps = APIMetricRowCommonProps &
  (APIClassicColorProps | ProgressBarProps) &
  Partial<Pick<APIMetric, 'summary'>>;

function buildMetricsAPI(column: ColumnState): APIMetricProps {
  const { summaryRow, summaryLabel } = column;
  return {
    ...buildCommonMetricRowProps(column),
    ...buildColorProps(column),
    ...(summaryRow && summaryRow !== 'none'
      ? { summary: { type: summaryRow, ...(summaryLabel != null ? { label: summaryLabel } : {}) } }
      : {}),
  };
}

function buildRowCommonProps(
  column: ColumnState
): Pick<NonNullable<DatatableConfig['rows']>[number], 'collapse_by' | 'click_filter'> {
  const { collapseFn, oneClickFilter } = column;
  return {
    ...buildCommonMetricRowProps(column),
    ...(collapseFn ? { collapse_by: collapseFn } : {}),
    ...(oneClickFilter !== undefined ? { click_filter: oneClickFilter } : {}),
  };
}

type APIRowPropsNoESQL = APIMetricRowCommonProps &
  Partial<
    Pick<
      NonNullable<DatatableConfigNoESQL['rows']>[number],
      'apply_color_to' | 'color' | 'collapse_by' | 'click_filter'
    >
  >;

function buildRowColorPropsNoESQL(
  column: ColumnState
): Pick<APIRowPropsNoESQL, 'apply_color_to' | 'color'> {
  const { colorMode, colorMapping, palette } = column;
  if (!colorMode || colorMode === 'none') {
    return {};
  }

  const applyColorTo = colorModeToApplyColorTo(colorMode);
  // The editor never offers a progress bar on DSL rows, and their schema has no branch for it.
  if (applyColorTo === 'progress_bar') {
    return {};
  }
  return {
    apply_color_to: applyColorTo,
    color:
      colorMapping || palette
        ? // Intentional `as PaletteOutput` type assertion as the legacy palette export bridge accepts palettes with opaque params.
          fromColorMappingLensStateToAPI(colorMapping, palette as PaletteOutput)
        : AUTO_COLOR,
  };
}

function buildRowsAPINoESQL(column: ColumnState): APIRowPropsNoESQL {
  return {
    ...buildRowCommonProps(column),
    ...buildRowColorPropsNoESQL(column),
  };
}

type APIRowPropsESQL = APIMetricRowCommonProps &
  (APIClassicColorProps | ProgressBarProps) &
  Partial<Pick<NonNullable<DatatableConfigESQL['rows']>[number], 'collapse_by' | 'click_filter'>>;

function buildRowsAPIESQL(column: ColumnState): APIRowPropsESQL {
  return {
    ...buildRowCommonProps(column),
    ...buildColorProps(column),
  };
}

type DatatableColumnsNoESQLAndMapping = Pick<
  DatatableConfigNoESQL,
  'metrics' | 'rows' | 'split_metrics_by'
> & { columnIdMapping: ColumnIdMapping };
type DatatableColumnsESQLAndMapping = Pick<
  DatatableConfigESQL,
  'metrics' | 'rows' | 'split_metrics_by'
> & { columnIdMapping: ColumnIdMapping };

export interface ColumnIdMappingValue {
  type: 'metric' | 'row' | 'split_metrics_by';
  index: number;
}

/**
 * Maps old column IDs to their new type and index in the API format.
 * Used to translate sorting column references during transformation.
 */
export type ColumnIdMapping = Map<string, ColumnIdMappingValue>;

export function convertDatatableColumnsToAPI(
  layer: Omit<FormBasedLayer, 'indexPatternId'>,
  visualization: DatatableVisualizationState
): DatatableColumnsNoESQLAndMapping;
export function convertDatatableColumnsToAPI(
  layer: TextBasedLayer,
  visualization: DatatableVisualizationState
): DatatableColumnsESQLAndMapping;
export function convertDatatableColumnsToAPI(
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer,
  visualization: DatatableVisualizationState
): DatatableColumnsNoESQLAndMapping | DatatableColumnsESQLAndMapping {
  const { columns } = visualization;
  if (columns.length === 0) {
    throw new Error('Datatable must have at least one column');
  }

  // Used for the sorting columnId mapping during transformation to API format
  const columnIdMapping: ColumnIdMapping = new Map();

  // Create a lookup map from columnId to visualization column state
  const columnStateMap = new Map(columns.map((col) => [col.columnId, col]));

  if (isFormBasedLayer(layer)) {
    const metrics: DatatableConfigNoESQL['metrics'] = [];
    const rows: NonNullable<DatatableConfigNoESQL['rows']> = [];
    const splitMetricsBy: NonNullable<DatatableConfigNoESQL['split_metrics_by']> = [];

    // Use columnOrder from the layer to preserve the correct row ordering/ aggregation nesting
    const orderedColumnIds = layer.columnOrder;

    for (const columnId of orderedColumnIds) {
      const column = columnStateMap.get(columnId);
      if (!column) continue; // Skip columns not in visualization state

      const apiOperation = operationFromColumn(columnId, layer);
      if (!apiOperation) throw new Error('Column not found');

      if (isMetricColumnNoESQL(column, layer.columns[columnId])) {
        if (!isAPIColumnOfMetricType(apiOperation)) {
          throw new Error(
            `Metric column ${columnId} must be a metric operation (got ${apiOperation.operation})`
          );
        }
        columnIdMapping.set(columnId, { type: 'metric', index: metrics.length });
        metrics.push({
          ...apiOperation,
          ...buildMetricsAPI(column),
        });
      } else if (column.isTransposed) {
        if (!isAPIColumnOfBucketType(apiOperation)) {
          throw new Error(
            `Split metric column ${columnId} must be a bucket operation (got ${apiOperation.operation})`
          );
        }
        columnIdMapping.set(columnId, { type: 'split_metrics_by', index: splitMetricsBy.length });
        splitMetricsBy.push(apiOperation);
      } else {
        if (!isAPIColumnOfBucketType(apiOperation)) {
          throw new Error(
            `Row column ${columnId} must be a bucket operation (got ${apiOperation.operation})`
          );
        }
        columnIdMapping.set(columnId, { type: 'row', index: rows.length });
        rows.push({
          ...apiOperation,
          ...buildRowsAPINoESQL(column),
        });
      }
    }

    if (metrics.length === 0) {
      throw new Error('Datatable must have at least one metric column');
    }

    return {
      metrics,
      ...(rows.length > 0 ? { rows } : {}),
      ...(splitMetricsBy.length > 0 ? { split_metrics_by: splitMetricsBy } : {}),
      columnIdMapping,
    };
  }

  const metrics: DatatableConfigESQL['metrics'] = [];
  const rows: NonNullable<DatatableConfigESQL['rows']> = [];
  const splitMetricsBy: NonNullable<DatatableConfigESQL['split_metrics_by']> = [];

  // Preserve ES|QL column order based on the datasource layer columns
  const orderedColumnIds = layer.columns.map(({ columnId }) => columnId);

  for (const columnId of orderedColumnIds) {
    const column = columnStateMap.get(columnId);
    if (!column) continue;

    const apiOperation = getValueApiColumn(columnId, layer);
    if (!apiOperation) throw new Error(`Column with id ${columnId} not found`);

    if (isMetricColumnESQL(column, layer.columns)) {
      columnIdMapping.set(columnId, { type: 'metric', index: metrics.length });
      metrics.push({
        ...apiOperation,
        ...buildMetricsAPI(column),
      });
    } else if (column.isTransposed) {
      columnIdMapping.set(columnId, { type: 'split_metrics_by', index: splitMetricsBy.length });
      splitMetricsBy.push(apiOperation);
    } else {
      columnIdMapping.set(columnId, { type: 'row', index: rows.length });
      rows.push({ ...apiOperation, ...buildRowsAPIESQL(column) });
    }
  }

  if (metrics.length === 0 && rows.length === 0) {
    throw new Error('Datatable must have at least one column');
  }

  return {
    ...(metrics.length > 0 ? { metrics } : {}),
    ...(rows.length > 0 ? { rows } : {}),
    ...(splitMetricsBy.length > 0 ? { split_metrics_by: splitMetricsBy } : {}),
    columnIdMapping,
  };
}
