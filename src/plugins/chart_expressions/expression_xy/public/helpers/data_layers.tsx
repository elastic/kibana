/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AreaSeriesProps,
  AreaSeriesStyle,
  BarSeriesProps,
  ColorVariant,
  LineSeriesProps,
  ScaleType,
  SeriesName,
  StackMode,
  XYChartSeriesIdentifier,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { IFieldFormat } from '@kbn/field-formats-plugin/common';
import { Datatable } from '@kbn/expressions-plugin';
import { getAccessorByDimension } from '@kbn/visualizations-plugin/common/utils';
import type { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common/expression_functions';
import { PaletteRegistry, SeriesLayer } from '@kbn/coloring';
import { CommonXYDataLayerConfig, XScaleType } from '../../common';
import { AxisModes, SeriesTypes } from '../../common/constants';
import { FormatFactory } from '../types';
import { getSeriesColor } from './state';
import { ColorAssignments } from './color_assignment';
import { GroupsConfiguration } from './axes_configuration';
import { LayerAccessorsTitles } from './layers';
import { getFormat } from './format';

type SeriesSpec = LineSeriesProps & BarSeriesProps & AreaSeriesProps;

type GetSeriesPropsFn = (config: {
  layer: CommonXYDataLayerConfig;
  titles?: LayerAccessorsTitles;
  accessor: string;
  chartHasMoreThanOneBarSeries?: boolean;
  formatFactory: FormatFactory;
  colorAssignments: ColorAssignments;
  columnToLabelMap: Record<string, string>;
  paletteService: PaletteRegistry;
  syncColors?: boolean;
  yAxis?: GroupsConfiguration[number];
  timeZone?: string;
  emphasizeFitting?: boolean;
  fillOpacity?: number;
  formattedDatatableInfo: DatatableWithFormatInfo;
  defaultXScaleType: XScaleType;
}) => SeriesSpec;

type GetSeriesNameFn = (
  data: XYChartSeriesIdentifier,
  config: {
    splitAccessors: Array<string | ExpressionValueVisDimension>;
    accessorsCount: number;
    columns: Datatable['columns'];
    formatFactory: FormatFactory;
    alreadyFormattedColumns: Record<string, boolean>;
    columnToLabelMap: Record<string, string>;
  },
  titles: LayerAccessorsTitles
) => SeriesName;

type GetColorFn = (
  seriesIdentifier: XYChartSeriesIdentifier,
  config: {
    layer: CommonXYDataLayerConfig;
    accessor: string;
    colorAssignments: ColorAssignments;
    paletteService: PaletteRegistry;
    getSeriesNameFn: (d: XYChartSeriesIdentifier) => SeriesName;
    syncColors?: boolean;
  }
) => string | null;

type GetPointConfigFn = (config: {
  xAccessor: string | undefined;
  markSizeAccessor: string | undefined;
  emphasizeFitting?: boolean;
  showPoints?: boolean;
  pointsRadius?: number;
}) => Partial<AreaSeriesStyle['point']>;

type GetLineConfigFn = (config: {
  showLines?: boolean;
  lineWidth?: number;
}) => Partial<AreaSeriesStyle['line']>;

export interface DatatableWithFormatInfo {
  table: Datatable;
  formattedColumns: Record<string, true>;
}

export type DatatablesWithFormatInfo = Record<string, DatatableWithFormatInfo>;

export type FormattedDatatables = Record<string, Datatable>;

const isPrimitive = (value: unknown): boolean => value != null && typeof value !== 'object';

export const getFormattedRow = (
  row: Datatable['rows'][number],
  columns: Datatable['columns'],
  columnsFormatters: Record<string, IFieldFormat>,
  xAccessor: string | undefined,
  xScaleType: XScaleType
): { row: Datatable['rows'][number]; formattedColumns: Record<string, true> } =>
  columns.reduce(
    (formattedInfo, { id }) => {
      const record = formattedInfo.row[id];
      if (
        record != null &&
        // pre-format values for ordinal x axes because there can only be a single x axis formatter on chart level
        (!isPrimitive(record) || (id === xAccessor && xScaleType === 'ordinal'))
      ) {
        return {
          row: { ...formattedInfo.row, [id]: columnsFormatters[id]!.convert(record) },
          formattedColumns: { ...formattedInfo.formattedColumns, [id]: true },
        };
      }
      return formattedInfo;
    },
    { row, formattedColumns: {} }
  );

export const getFormattedTable = (
  table: Datatable,
  formatFactory: FormatFactory,
  xAccessor: string | ExpressionValueVisDimension | undefined,
  accessors: Array<string | ExpressionValueVisDimension>,
  xScaleType: XScaleType
): { table: Datatable; formattedColumns: Record<string, true> } => {
  const columnsFormatters = table.columns.reduce<Record<string, IFieldFormat>>(
    (formatters, { id, meta }) => {
      const accessor: string | ExpressionValueVisDimension | undefined = accessors.find(
        (a) => getAccessorByDimension(a, table.columns) === id
      );

      return {
        ...formatters,
        [id]: formatFactory(accessor ? getFormat(table.columns, accessor) : meta.params),
      };
    },
    {}
  );

  const formattedTableInfo: {
    rows: Datatable['rows'];
    formattedColumns: Record<string, true>;
  } = {
    rows: [],
    formattedColumns: {},
  };
  for (const row of table.rows) {
    const formattedRowInfo = getFormattedRow(
      row,
      table.columns,
      columnsFormatters,
      xAccessor ? getAccessorByDimension(xAccessor, table.columns) : undefined,
      xScaleType
    );
    formattedTableInfo.rows.push(formattedRowInfo.row);
    formattedTableInfo.formattedColumns = {
      ...formattedTableInfo.formattedColumns,
      ...formattedRowInfo.formattedColumns,
    };
  }

  return {
    table: { ...table, rows: formattedTableInfo.rows },
    formattedColumns: formattedTableInfo.formattedColumns,
  };
};

export const getFormattedTablesByLayers = (
  layers: CommonXYDataLayerConfig[],
  formatFactory: FormatFactory
): DatatablesWithFormatInfo =>
  layers.reduce(
    (
      formattedDatatables,
      { layerId, table, xAccessor, splitAccessors = [], accessors, xScaleType }
    ) => ({
      ...formattedDatatables,
      [layerId]: getFormattedTable(
        table,
        formatFactory,
        xAccessor,
        [xAccessor, ...splitAccessors, ...accessors].filter<string | ExpressionValueVisDimension>(
          (a): a is string | ExpressionValueVisDimension => a !== undefined
        ),
        xScaleType
      ),
    }),
    {}
  );

function getSplitValues(
  splitAccessorsMap: XYChartSeriesIdentifier['splitAccessors'],
  splitAccessors: Array<string | ExpressionValueVisDimension>,
  alreadyFormattedColumns: Record<string, boolean>,
  columns: Datatable['columns'],
  formatFactory: FormatFactory
) {
  if (splitAccessorsMap.size < 0) {
    return [];
  }

  return [...splitAccessorsMap].reduce<Array<string | number>>((acc, [splitAccessor, value]) => {
    const split = splitAccessors.find(
      (accessor) => getAccessorByDimension(accessor, columns) === splitAccessor
    );
    if (split) {
      const splitColumnId = getAccessorByDimension(split, columns);
      const splitFormatByAccessor = getFormat(columns, split);
      const splitFormatter = formatFactory(splitFormatByAccessor);
      return [
        ...acc,
        alreadyFormattedColumns[splitColumnId] ? value : splitFormatter.convert(value),
      ];
    }

    return acc;
  }, []);
}

export const getSeriesName: GetSeriesNameFn = (
  data,
  {
    splitAccessors,
    accessorsCount,
    columns,
    formatFactory,
    alreadyFormattedColumns,
    columnToLabelMap,
  },
  titles
) => {
  // For multiple y series, the name of the operation is used on each, either:
  // * Key - Y name
  // * Formatted value - Y name

  const splitValues = getSplitValues(
    data.splitAccessors,
    splitAccessors,
    alreadyFormattedColumns,
    columns,
    formatFactory
  );

  const key = data.seriesKeys[data.seriesKeys.length - 1];
  const yAccessorTitle = columnToLabelMap[key] ?? titles?.yTitles?.[key] ?? null;

  if (accessorsCount > 1) {
    if (splitValues.length === 0) {
      return yAccessorTitle;
    }
    return `${splitValues.join(' - ')}${yAccessorTitle ? ' - ' + yAccessorTitle : ''}`;
  }

  return splitValues.length > 0 ? splitValues.join(' - ') : yAccessorTitle;
};

const getPointConfig: GetPointConfigFn = ({
  xAccessor,
  markSizeAccessor,
  emphasizeFitting,
  showPoints,
  pointsRadius,
}) => ({
  visible: showPoints !== undefined ? showPoints : !xAccessor || markSizeAccessor !== undefined,
  radius: pointsRadius !== undefined ? pointsRadius : xAccessor && !emphasizeFitting ? 5 : 0,
  fill: markSizeAccessor ? ColorVariant.Series : undefined,
});

const getFitLineConfig = () => ({
  visible: true,
  stroke: ColorVariant.Series,
  opacity: 1,
  dash: [],
});

const getLineConfig: GetLineConfigFn = ({ showLines, lineWidth }) => ({
  strokeWidth: lineWidth,
  visible: showLines,
});

const getColor: GetColorFn = (
  series,
  { layer, accessor, colorAssignments, paletteService, syncColors, getSeriesNameFn }
) => {
  const overwriteColor = getSeriesColor(layer, accessor);
  if (overwriteColor !== null) {
    return overwriteColor;
  }
  const colorAssignment = colorAssignments[layer.palette.name];

  const name = getSeriesNameFn(series)?.toString() || '';

  const seriesLayers: SeriesLayer[] = [
    {
      name,
      totalSeriesAtDepth: colorAssignment.totalSeriesCount,
      rankAtDepth: colorAssignment.getRank(layer, name),
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

const EMPTY_ACCESSOR = '-';
const SPLIT_CHAR = '.';

export const generateSeriesId = (
  { layerId, xAccessor }: Pick<CommonXYDataLayerConfig, 'layerId' | 'xAccessor'>,
  splitColumnIds: string[],
  accessor?: string
) =>
  [layerId, xAccessor ?? EMPTY_ACCESSOR, accessor ?? EMPTY_ACCESSOR, ...splitColumnIds].join(
    SPLIT_CHAR
  );

export const getMetaFromSeriesId = (seriesId: string) => {
  const [layerId, xAccessor, yAccessor, ...splitAccessors] = seriesId.split(SPLIT_CHAR);
  return {
    layerId,
    xAccessor: xAccessor === EMPTY_ACCESSOR ? undefined : xAccessor,
    yAccessor,
    splitAccessor: splitAccessors[0] === EMPTY_ACCESSOR ? undefined : splitAccessors,
  };
};

export const getSeriesProps: GetSeriesPropsFn = ({
  layer,
  titles = {},
  accessor,
  chartHasMoreThanOneBarSeries,
  colorAssignments,
  formatFactory,
  columnToLabelMap,
  paletteService,
  syncColors,
  yAxis,
  timeZone,
  emphasizeFitting,
  fillOpacity,
  formattedDatatableInfo,
  defaultXScaleType,
}): SeriesSpec => {
  const { table, isStacked, markSizeAccessor } = layer;
  const isPercentage = layer.isPercentage;
  let stackMode: StackMode | undefined = isPercentage ? AxisModes.PERCENTAGE : undefined;
  if (yAxis?.mode) {
    stackMode = yAxis?.mode === AxisModes.NORMAL ? undefined : yAxis?.mode;
  }
  const scaleType = yAxis?.scaleType || ScaleType.Linear;
  const isBarChart = layer.seriesType === SeriesTypes.BAR;
  const xColumnId = layer.xAccessor && getAccessorByDimension(layer.xAccessor, table.columns);
  const splitColumnIds =
    layer.splitAccessors?.map((splitAccessor) => {
      return getAccessorByDimension(splitAccessor, table.columns);
    }) || [];
  const enableHistogramMode =
    layer.isHistogram &&
    (isStacked || !splitColumnIds.length) &&
    (isStacked || !isBarChart || !chartHasMoreThanOneBarSeries);

  const formatter = table?.columns.find((column) => column.id === accessor)?.meta?.params;

  const markSizeColumnId = markSizeAccessor
    ? getAccessorByDimension(markSizeAccessor, table.columns)
    : undefined;

  const markFormatter = formatFactory(
    markSizeAccessor ? getFormat(table.columns, markSizeAccessor) : undefined
  );

  // what if row values are not primitive? That is the case of, for instance, Ranges
  // remaps them to their serialized version with the formatHint metadata
  // In order to do it we need to make a copy of the table as the raw one is required for more features (filters, etc...) later on
  const { table: formattedTable, formattedColumns } = formattedDatatableInfo;

  // For date histogram chart type, we're getting the rows that represent intervals without data.
  // To not display them in the legend, they need to be filtered out.
  let rows = formattedTable.rows.filter(
    (row) =>
      !(xColumnId && row[xColumnId] === undefined) &&
      !(
        splitColumnIds.some((splitColumnId) => row[splitColumnId] === undefined) &&
        row[accessor] === undefined
      )
  );

  if (!xColumnId) {
    rows = rows.map((row) => ({
      ...row,
      unifiedX: i18n.translate('expressionXY.xyChart.emptyXLabel', {
        defaultMessage: '(empty)',
      }),
    }));
  }

  const getSeriesNameFn = (d: XYChartSeriesIdentifier) => {
    return getSeriesName(
      d,
      {
        splitAccessors: layer.splitAccessors || [],
        accessorsCount: layer.accessors.length,
        alreadyFormattedColumns: formattedColumns,
        columns: formattedTable.columns,
        formatFactory,
        columnToLabelMap,
      },
      titles
    );
  };

  return {
    splitSeriesAccessors: splitColumnIds.length ? splitColumnIds : [],
    stackAccessors: isStacked ? [layer.xAccessor as string] : [],
    id: generateSeriesId(
      layer,
      splitColumnIds.length ? splitColumnIds : [EMPTY_ACCESSOR],
      accessor
    ),
    xAccessor: xColumnId || 'unifiedX',
    yAccessors: [accessor],
    markSizeAccessor: markSizeColumnId,
    markFormat: (value) => markFormatter.convert(value),
    data: rows,
    xScaleType: xColumnId ? layer.xScaleType ?? defaultXScaleType : 'ordinal',
    yScaleType:
      formatter?.id === 'bytes' && scaleType === ScaleType.Linear
        ? ScaleType.LinearBinary
        : scaleType,
    color: (series) =>
      getColor(series, {
        layer,
        accessor,
        colorAssignments,
        paletteService,
        getSeriesNameFn,
        syncColors,
      }),
    groupId: yAxis?.groupId,
    enableHistogramMode,
    stackMode,
    timeZone,
    areaSeriesStyle: {
      point: getPointConfig({
        xAccessor: xColumnId,
        markSizeAccessor: markSizeColumnId,
        emphasizeFitting,
        showPoints: layer.showPoints,
        pointsRadius: layer.pointsRadius,
      }),
      ...(fillOpacity && { area: { opacity: fillOpacity } }),
      ...(emphasizeFitting && {
        fit: { area: { opacity: fillOpacity || 0.5 }, line: getFitLineConfig() },
      }),
      line: getLineConfig({
        showLines: layer.showLines,
        lineWidth: layer.lineWidth,
      }),
    },
    lineSeriesStyle: {
      point: getPointConfig({
        xAccessor: xColumnId,
        markSizeAccessor: markSizeColumnId,
        emphasizeFitting,
        showPoints: layer.showPoints,
        pointsRadius: layer.pointsRadius,
      }),
      ...(emphasizeFitting && { fit: { line: getFitLineConfig() } }),
      line: getLineConfig({ lineWidth: layer.lineWidth, showLines: layer.showLines }),
    },
    name(d) {
      return getSeriesNameFn(d);
    },
  };
};
