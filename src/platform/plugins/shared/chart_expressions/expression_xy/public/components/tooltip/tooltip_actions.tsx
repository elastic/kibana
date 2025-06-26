/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Datum, TooltipAction, TooltipValue, XYChartSeriesIdentifier } from '@elastic/charts';
import {
  getAccessorByDimension,
  getColumnByAccessor,
} from '@kbn/visualizations-plugin/common/utils';
import { FormatFactory } from '@kbn/visualization-ui-components';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import { i18n } from '@kbn/i18n';
import { MultiClickTriggerEvent } from '@kbn/charts-plugin/public';
import { Datatable } from '@kbn/expressions-plugin/common';
import { BooleanRelation } from '@kbn/es-query';
import type { AlertRuleFromVisUIActionData } from '@kbn/alerts-ui-shared';
import { ESQL_TABLE_TYPE } from '@kbn/data-plugin/common';
import { isTimeChart } from '../../../common/helpers';
import { CommonXYDataLayerConfig } from '../../../common';
import { DatatablesWithFormatInfo, LayersFieldFormats } from '../../helpers';
import { MultiFilterEvent } from '../../types';

type XYTooltipValue = TooltipValue<Record<string, string | number>, XYChartSeriesIdentifier>;

function nonNullable<T>(v: T): v is NonNullable<T> {
  return v != null;
}

export function createSplitPoint(
  accessor: string | number,
  value: string | number | undefined,
  rows: Datatable['rows'],
  table: Datatable
) {
  if (value === undefined) return;
  const splitPointRowIndex = rows.findIndex((row) => {
    if (Array.isArray(value)) {
      return value.includes(row[accessor]);
    }
    return row[accessor] === value;
  });
  if (splitPointRowIndex !== -1) {
    return {
      row: splitPointRowIndex,
      column: table.columns.findIndex((column) => column.id === accessor),
      value: table.rows[splitPointRowIndex][accessor],
      table,
    };
  }
}

export const getXSeriesPoint = (
  layer: CommonXYDataLayerConfig,
  value: any,
  fieldFormats: LayersFieldFormats,
  formattedDatatables: DatatablesWithFormatInfo,
  xAxisFormatter: FieldFormat,
  formatFactory: FormatFactory
) => {
  const { table } = layer;
  const xColumn = layer.xAccessor && getColumnByAccessor(layer.xAccessor, table.columns);
  const xAccessor = layer.xAccessor
    ? getAccessorByDimension(layer.xAccessor, table.columns)
    : undefined;

  const xFormat = xColumn ? fieldFormats[layer.layerId].xAccessors[xColumn.id] : undefined;
  const currentXFormatter =
    xAccessor && formattedDatatables[layer.layerId]?.formattedColumns[xAccessor] && xColumn
      ? formatFactory(xFormat)
      : xAxisFormatter;

  const rowIndex = table.rows.findIndex((row) => {
    if (xAccessor) {
      if (formattedDatatables[layer.layerId]?.formattedColumns[xAccessor]) {
        // stringify the value to compare with the chart value
        return currentXFormatter.convert(row[xAccessor]) === value;
      }
      return row[xAccessor] === value;
    }
  });

  return {
    row: rowIndex,
    column: table.columns.findIndex((col) => col.id === xAccessor),
    table,
    value: xAccessor ? table.rows[rowIndex][xAccessor] : value,
  };
};

function getXSeriesValue(dataLayers: CommonXYDataLayerConfig[], firstSeries: XYTooltipValue) {
  const layer = dataLayers.find((l) =>
    firstSeries.seriesIdentifier.seriesKeys.some((key: string | number) =>
      l.accessors.some(
        (accessor) => getAccessorByDimension(accessor, l.table.columns) === key.toString()
      )
    )
  );
  if (!layer) return;

  const { table } = layer;

  const xAccessor = layer.xAccessor
    ? getAccessorByDimension(layer.xAccessor, table.columns)
    : undefined;

  return xAccessor ? firstSeries.datum?.[xAccessor] : null;
}

export const getTooltipActions = (
  dataLayers: CommonXYDataLayerConfig[],
  onClickMultiValue: (data: MultiFilterEvent['data']) => void,
  onCreateAlertRule: (data: AlertRuleFromVisUIActionData) => void,
  fieldFormats: LayersFieldFormats,
  formattedDatatables: DatatablesWithFormatInfo,
  xAxisFormatter: FieldFormat,
  formatFactory: FormatFactory,
  isEsqlMode?: boolean,
  canCreateAlerts?: boolean,
  isEnabled?: boolean
) => {
  if (!isEnabled) return;
  const hasSplitAccessors = dataLayers.some((l) => l.splitAccessors?.length);
  const hasXAxis = dataLayers.every((l) => l.xAccessor);
  const isTimeViz = isTimeChart(dataLayers);

  const xSeriesActions: Array<TooltipAction<Datum, XYChartSeriesIdentifier>> =
    !isEsqlMode && hasXAxis
      ? [
          {
            disabled: () => !hasXAxis,
            label: (_, [firstSeries]: XYTooltipValue[]) => {
              if (isTimeViz) {
                return i18n.translate('expressionXY.tooltipActions.filterByTime', {
                  defaultMessage: 'Filter by time',
                });
              }

              const value = getXSeriesValue(dataLayers, firstSeries);

              return i18n.translate('expressionXY.tooltipActions.filterForXSeries', {
                defaultMessage: 'Filter for {value}',
                values: {
                  value: xAxisFormatter.convert(value) || value,
                },
              });
            },

            onSelect: (_: XYTooltipValue[], [firstSeries]: XYTooltipValue[]) => {
              const layer = dataLayers.find((l) =>
                firstSeries.seriesIdentifier.seriesKeys.some((key: string | number) =>
                  l.accessors.some(
                    (accessor) =>
                      getAccessorByDimension(accessor, l.table.columns) === key.toString()
                  )
                )
              );
              if (!layer) return;

              const value = getXSeriesValue(dataLayers, firstSeries);

              const xSeriesPoint = getXSeriesPoint(
                layer,
                value,
                fieldFormats,
                formattedDatatables,
                xAxisFormatter,
                formatFactory
              );

              const context: MultiFilterEvent['data'] = {
                data: [
                  {
                    table: xSeriesPoint.table,
                    cells: [
                      {
                        row: xSeriesPoint.row,
                        column: xSeriesPoint.column,
                      },
                    ],
                  },
                ],
              };
              onClickMultiValue(context);
            },
          },
        ]
      : [];

  const alertRulesTooltipActions: Array<TooltipAction<Datum, XYChartSeriesIdentifier>> =
    isEsqlMode && canCreateAlerts
      ? [
          {
            disabled: () => !isEsqlMode,
            label: () =>
              i18n.translate('expressionXY.tooltipActions.addAlertRule', {
                defaultMessage: 'Create alert rule',
              }),

            onSelect: (selectedValues: XYTooltipValue[], series: XYTooltipValue[]) => {
              const [firstSeries] = series;
              const layer = dataLayers.find((l) =>
                firstSeries.seriesIdentifier.seriesKeys.some((key: string | number) =>
                  l.accessors.some(
                    (accessor) =>
                      getAccessorByDimension(accessor, l.table.columns) === key.toString()
                  )
                )
              );
              if (!layer) return;

              const { xAccessor } = firstSeries.seriesIdentifier;

              const xSeriesValue = getXSeriesValue(dataLayers, firstSeries);

              const xSeriesPoint = getXSeriesPoint(
                layer,
                xSeriesValue,
                fieldFormats,
                formattedDatatables,
                xAxisFormatter,
                formatFactory
              );

              const { table } = xSeriesPoint;
              const xColumn = getColumnByAccessor(xAccessor.toString(), table.columns);

              // Get the field name and value for the Y axis
              const selectedYValues = selectedValues.length ? selectedValues : [firstSeries];
              const thresholdValues = selectedYValues
                .map((value) => {
                  const { yAccessor, splitAccessors } = value.seriesIdentifier;
                  const yColumn = getColumnByAccessor(yAccessor.toString(), table.columns);
                  if (!yColumn || !yColumn.meta.sourceParams) return null;
                  const { sourceField } = yColumn.meta.sourceParams;
                  const yValue = value.value as number;
                  // If there is no sourceField, wrap the Y axis label in {curly braces} to let the user set the field name manually
                  const esqlFieldName = String(sourceField ?? `{${yColumn?.name ?? 'Y'}}`);
                  const values: Record<string, string | number> = {
                    [esqlFieldName]: yValue,
                  };
                  if (splitAccessors.size > 0) {
                    for (const [accessor, splitValue] of splitAccessors) {
                      const splitColumn = getColumnByAccessor(accessor.toString(), table.columns);
                      const { sourceField: splitSourceField } =
                        splitColumn?.meta?.sourceParams ?? {};
                      if (!splitSourceField) continue;
                      values[String(splitSourceField)] = splitValue;
                    }
                  }
                  return { values, yField: esqlFieldName };
                })
                .filter(Boolean) as AlertRuleFromVisUIActionData['thresholdValues'];

              // Get the time field name from the X axis for time vizzes, default to timestamp for non-time vizzes
              const { sourceField: xSourceField } = xColumn?.meta?.sourceParams ?? {};

              // For non-time vizzes, report the X axis
              const xValues =
                isTimeViz || !hasXAxis
                  ? {}
                  : {
                      // If there is no sourceField, wrap the X axis label in [brackets] to let the user set the field name manually
                      [String(xSourceField ?? `[${xColumn?.name ?? 'X'}]`)]:
                        // Use xSeriesPoint.value instead of xSeriesValue; this is always the raw ES value, xSeriesValue sometimes returns
                        // the display value
                        xSeriesPoint.value,
                    };

              const query =
                table.meta?.type === ESQL_TABLE_TYPE ? (table.meta.query as string) : null;

              const context = {
                thresholdValues,
                xValues,
                query,
              };
              onCreateAlertRule(context);
            },
          },
        ]
      : [];

  const breakdownTooltipActions: Array<TooltipAction<Datum, XYChartSeriesIdentifier>> =
    !isEsqlMode && hasSplitAccessors
      ? [
          {
            disabled: (selected) => selected.length < 1,
            label: (selected) =>
              selected.length === 0
                ? i18n.translate('expressionXY.tooltipActions.emptyFilterSelection', {
                    defaultMessage: 'Select at least one series to filter',
                  })
                : i18n.translate('expressionXY.tooltipActions.filterValues', {
                    defaultMessage: 'Filter {seriesNumber} selected series',
                    values: { seriesNumber: selected.length },
                  }),
            onSelect: (tooltipSelectedValues: XYTooltipValue[]) => {
              const layerIndexes: number[] = [];
              tooltipSelectedValues.forEach((v) => {
                const index = dataLayers.findIndex((l) =>
                  v.seriesIdentifier.seriesKeys.some((key: string | number) =>
                    l.accessors.some(
                      (accessor) =>
                        getAccessorByDimension(accessor, l.table.columns) === key.toString()
                    )
                  )
                );
                if (!layerIndexes.includes(index) && index !== -1) {
                  layerIndexes.push(index);
                }
              });

              const filterPoints: MultiClickTriggerEvent['data']['data'] = [];

              if (!layerIndexes.length) return;
              layerIndexes.forEach((layerIndex) => {
                const layer = dataLayers[layerIndex];
                const { table } = layer;

                if (layer.splitAccessors?.length !== 1) return;

                const splitAccessor = getAccessorByDimension(
                  layer.splitAccessors[0],
                  table.columns
                );
                const splitPoints = tooltipSelectedValues
                  .map((v) =>
                    createSplitPoint(
                      splitAccessor,
                      v.datum?.[splitAccessor],
                      formattedDatatables[layer.layerId].table.rows,
                      table
                    )
                  )
                  .filter(nonNullable);
                if (splitPoints.length) {
                  filterPoints.push({
                    cells: splitPoints.map(({ row, column }) => ({ row, column })),
                    relation: BooleanRelation.OR,
                    table,
                  });
                }
              });
              if (filterPoints?.length) {
                onClickMultiValue({
                  data: filterPoints,
                });
              }
            },
          },
        ]
      : [];
  const actions = [...xSeriesActions, ...breakdownTooltipActions, ...alertRulesTooltipActions];
  if (!actions.length) return;
  return actions;
};
