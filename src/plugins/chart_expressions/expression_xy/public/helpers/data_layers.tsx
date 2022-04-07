/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AreaSeriesProps,
  BarSeriesProps,
  ColorVariant,
  LineSeriesProps,
  ScaleType,
  SeriesName,
  StackMode,
  XYChartSeriesIdentifier,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import {
  FieldFormat,
  FieldFormatParams,
  SerializedFieldFormat,
} from 'src/plugins/field_formats/common';
import type { ExpressionValueVisDimension } from '../../../../visualizations/public';
import {
  getAccessorByDimension,
  getFormatByAccessor,
} from '../../../../visualizations/common/utils';
import { Datatable, DatatableRow } from '../../../../expressions';
import { CommonXYDataLayerConfigResult, XScaleType } from '../../common';
import { FormatFactory } from '../types';
import { PaletteRegistry, SeriesLayer } from '../../../../charts/public';
import { getSeriesColor } from './state';
import { ColorAssignments } from './color_assignment';
import { GroupsConfiguration } from './axes_configuration';

type SeriesSpec = LineSeriesProps & BarSeriesProps & AreaSeriesProps;

type GetSeriesPropsFn = (config: {
  layer: CommonXYDataLayerConfigResult;
  layerId: number;
  accessor: string;
  chartHasMoreThanOneBarSeries?: boolean;
  formatFactory: FormatFactory;
  colorAssignments: ColorAssignments;
  columnToLabelMap: Record<string, string>;
  paletteService: PaletteRegistry;
  alreadyFormattedColumns: Record<string, boolean>;
  syncColors?: boolean;
  yAxis?: GroupsConfiguration[number];
  timeZone?: string;
  emphasizeFitting?: boolean;
  fillOpacity?: number;
}) => SeriesSpec;

const isPrimitive = (value: unknown): boolean => value != null && typeof value !== 'object';

export const getFormattedTable = (
  table: Datatable,
  formatFactory: FormatFactory,
  xAccessor: string | ExpressionValueVisDimension | undefined,
  xScaleType: XScaleType
): Datatable => {
  const xColumnId = xAccessor ? getAccessorByDimension(xAccessor, table.columns) : '';
  return {
    ...table,
    rows: table.rows.map((row: DatatableRow) => {
      const newRow = { ...row };
      for (const column of table.columns) {
        const record = newRow[column.id];
        if (
          record != null &&
          // pre-format values for ordinal x axes because there can only be a single x axis formatter on chart level
          (!isPrimitive(record) || (column.id === xColumnId && xScaleType === 'ordinal'))
        ) {
          newRow[column.id] = formatFactory(getFormatByAccessor(xColumnId, table.columns))!.convert(
            record
          );
        }
      }
      return newRow;
    }),
  };
};

export const getIsAlreadyFormattedLayerInfo = (
  { table, xAccessor, xScaleType }: CommonXYDataLayerConfigResult,
  formatFactory: FormatFactory
): Record<string, boolean> => {
  const formattedTable = getFormattedTable(table, formatFactory, xAccessor, xScaleType);
  return table.columns.reduce<Record<string, boolean>>(
    (alreadyFormatted: Record<string, boolean>, { id }) => {
      if (alreadyFormatted[id]) {
        return alreadyFormatted;
      }
      return {
        ...alreadyFormatted,
        [id]: table.rows.some((row, i) => row[id] !== formattedTable.rows[i][id]),
      };
    },
    {}
  );
};

export const getAreAlreadyFormattedLayersInfo = (
  layers: CommonXYDataLayerConfigResult[],
  formatFactory: FormatFactory
): Record<number, Record<string, boolean>> =>
  layers.reduce<Record<number, Record<string, boolean>>>(
    (areAlreadyFormatted, layer, index) => ({
      ...areAlreadyFormatted,
      [index]: getIsAlreadyFormattedLayerInfo(layer, formatFactory),
    }),
    {}
  );

type GetSeriesNameFn = (
  data: XYChartSeriesIdentifier,
  config: {
    splitColumnId?: string;
    accessorsCount: number;
    splitHint: SerializedFieldFormat<FieldFormatParams> | undefined;
    splitFormatter: FieldFormat;
    alreadyFormattedColumns: Record<string, boolean>;
    columnToLabelMap: Record<string, string>;
  }
) => SeriesName;

const getSeriesName: GetSeriesNameFn = (
  data,
  {
    splitColumnId,
    accessorsCount,
    splitHint,
    splitFormatter,
    alreadyFormattedColumns,
    columnToLabelMap,
  }
) => {
  // For multiple y series, the name of the operation is used on each, either:
  // * Key - Y name
  // * Formatted value - Y name
  if (splitColumnId && accessorsCount > 1) {
    const formatted = alreadyFormattedColumns[splitColumnId];
    const result = data.seriesKeys
      .map((key: string | number, i) => {
        if (i === 0 && splitHint && splitColumnId && !formatted) {
          return splitFormatter.convert(key);
        }
        return splitColumnId && i === 0 ? key : columnToLabelMap[key] ?? null;
      })
      .join(' - ');
    return result;
  }

  // For formatted split series, format the key
  // This handles splitting by dates, for example
  if (splitHint) {
    if (splitColumnId && alreadyFormattedColumns[splitColumnId]) {
      return data.seriesKeys[0];
    }
    return splitFormatter.convert(data.seriesKeys[0]);
  }
  // This handles both split and single-y cases:
  // * If split series without formatting, show the value literally
  // * If single Y, the seriesKey will be the accessor, so we show the human-readable name
  return splitColumnId ? data.seriesKeys[0] : columnToLabelMap[data.seriesKeys[0]] ?? null;
};

const getPointConfig = (xAccessor?: string, emphasizeFitting?: boolean) => ({
  visible: !xAccessor,
  radius: xAccessor && !emphasizeFitting ? 5 : 0,
});

const getLineConfig = () => ({ visible: true, stroke: ColorVariant.Series, opacity: 1, dash: [] });

type GetColorFn = (
  seriesIdentifier: XYChartSeriesIdentifier,
  config: {
    layer: CommonXYDataLayerConfigResult;
    layerId: number;
    accessor: string;
    colorAssignments: ColorAssignments;
    columnToLabelMap: Record<string, string>;
    paletteService: PaletteRegistry;
    syncColors?: boolean;
  }
) => string | null;

const getColor: GetColorFn = (
  { yAccessor, seriesKeys },
  { layer, layerId, accessor, colorAssignments, columnToLabelMap, paletteService, syncColors }
) => {
  const overwriteColor = getSeriesColor(layer, accessor);
  if (overwriteColor !== null) {
    return overwriteColor;
  }
  const colorAssignment = colorAssignments[layer.palette.name];
  const seriesLayers: SeriesLayer[] = [
    {
      name: layer.splitAccessor ? String(seriesKeys[0]) : columnToLabelMap[seriesKeys[0]],
      totalSeriesAtDepth: colorAssignment.totalSeriesCount,
      rankAtDepth: colorAssignment.getRank(
        layer,
        layerId,
        String(seriesKeys[0]),
        String(yAccessor)
      ),
    },
  ];
  return paletteService.get(layer.palette.name).getCategoricalColor(
    seriesLayers,
    {
      maxDepth: 1,
      behindText: false,
      totalSeries: colorAssignment.totalSeriesCount,
      syncColors,
    },
    layer.palette.params
  );
};

export const getSeriesProps: GetSeriesPropsFn = ({
  layer,
  layerId,
  accessor,
  chartHasMoreThanOneBarSeries,
  colorAssignments,
  formatFactory,
  columnToLabelMap,
  paletteService,
  alreadyFormattedColumns,
  syncColors,
  yAxis,
  timeZone,
  emphasizeFitting,
  fillOpacity,
}): SeriesSpec => {
  const { table } = layer;
  const isStacked = layer.seriesType.includes('stacked');
  const isPercentage = layer.seriesType.includes('percentage');
  const isBarChart = layer.seriesType.includes('bar');
  const xColumnId = layer.xAccessor && getAccessorByDimension(layer.xAccessor, table.columns);
  const splitColumnId =
    layer.splitAccessor && getAccessorByDimension(layer.splitAccessor, table.columns);
  const enableHistogramMode =
    layer.isHistogram &&
    (isStacked || !layer.splitAccessor) &&
    (isStacked || !isBarChart || !chartHasMoreThanOneBarSeries);

  const formatter = table?.columns.find((column) => column.id === accessor)?.meta?.params;
  const splitHint = layer.splitAccessor
    ? getFormatByAccessor(layer.splitAccessor, table.columns)
    : undefined;
  const splitFormatter = formatFactory(splitHint);

  // what if row values are not primitive? That is the case of, for instance, Ranges
  // remaps them to their serialized version with the formatHint metadata
  // In order to do it we need to make a copy of the table as the raw one is required for more features (filters, etc...) later on
  const formattedTable: Datatable = getFormattedTable(
    table,
    formatFactory,
    layer.xAccessor,
    layer.xScaleType
  );

  // For date histogram chart type, we're getting the rows that represent intervals without data.
  // To not display them in the legend, they need to be filtered out.
  const rows = formattedTable.rows.filter(
    (row) =>
      !(xColumnId && typeof row[xColumnId] === 'undefined') &&
      !(
        splitColumnId &&
        typeof row[splitColumnId] === 'undefined' &&
        typeof row[accessor] === 'undefined'
      )
  );

  if (!xColumnId) {
    rows.forEach((row) => {
      row.unifiedX = i18n.translate('expressionXY.xyChart.emptyXLabel', {
        defaultMessage: '(empty)',
      });
    });
  }
  return {
    splitSeriesAccessors: splitColumnId ? [splitColumnId] : [],
    stackAccessors: isStacked ? [xColumnId as string] : [],
    id: splitColumnId ? `${splitColumnId}-${accessor}` : accessor,
    xAccessor: xColumnId || 'unifiedX',
    yAccessors: [accessor],
    data: rows,
    xScaleType: xColumnId ? layer.xScaleType : 'ordinal',
    yScaleType:
      formatter?.id === 'bytes' && layer.yScaleType === ScaleType.Linear
        ? ScaleType.LinearBinary
        : layer.yScaleType,
    color: (series) =>
      getColor(series, {
        layer,
        layerId,
        accessor,
        colorAssignments,
        columnToLabelMap,
        paletteService,
        syncColors,
      }),
    groupId: yAxis?.groupId,
    enableHistogramMode,
    stackMode: isPercentage ? StackMode.Percentage : undefined,
    timeZone,
    areaSeriesStyle: {
      point: getPointConfig(xColumnId, emphasizeFitting),
      ...(fillOpacity && { area: { opacity: fillOpacity } }),
      ...(emphasizeFitting && {
        fit: { area: { opacity: fillOpacity || 0.5 }, line: getLineConfig() },
      }),
    },
    lineSeriesStyle: {
      point: getPointConfig(xColumnId, emphasizeFitting),
      ...(emphasizeFitting && { fit: { line: getLineConfig() } }),
    },
    name(d) {
      return getSeriesName(d, {
        splitColumnId,
        accessorsCount: layer.accessors.length,
        splitHint,
        splitFormatter,
        alreadyFormattedColumns,
        columnToLabelMap,
      });
    },
  };
};
