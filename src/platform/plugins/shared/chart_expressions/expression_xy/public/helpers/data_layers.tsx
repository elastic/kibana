/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  SeriesColorAccessorFn,
} from '@elastic/charts';
import type { PersistedState } from '@kbn/visualizations-plugin/public';
import { Datatable } from '@kbn/expressions-plugin/common';
import { getAccessorByDimension } from '@kbn/visualizations-plugin/common/utils';
import type { ExpressionValueVisDimension } from '@kbn/visualizations-plugin/common/expression_functions';
import { PaletteRegistry, SeriesLayer } from '@kbn/coloring';
import {
  DatatableWithFormatInfo,
  getColorCategories,
  getFormattedTable,
} from '@kbn/chart-expressions-common';
import { KbnPalettes } from '@kbn/palettes';
import { RawValue } from '@kbn/data-plugin/common';
import { isDataLayer } from '../../common/utils/layer_types_guards';
import {
  CommonXYDataLayerConfig,
  CommonXYLayerConfig,
  XScaleType,
  PointVisibility,
} from '../../common';
import { AxisModes, SeriesTypes } from '../../common/constants';
import { FormatFactory } from '../types';
import { getSeriesColor } from './state';
import { ColorAssignments } from './color_assignment';
import { GroupsConfiguration } from './axes_configuration';
import { LayerAccessorsTitles, LayerFieldFormats, LayersFieldFormats } from './layers';
import { getFormat } from './format';
import { getColorSeriesAccessorFn } from './color/color_mapping_accessor';

type SeriesSpec = LineSeriesProps & BarSeriesProps & AreaSeriesProps;
export type InvertedRawValueMap = Map<string, Map<string, RawValue>>;

type GetSeriesPropsFn = (config: {
  layer: CommonXYDataLayerConfig;
  titles?: LayerAccessorsTitles;
  accessor: string | string[];
  chartHasMoreThanOneBarSeries?: boolean;
  formatFactory: FormatFactory;
  colorAssignments: ColorAssignments;
  columnToLabelMap: Record<string, string>;
  paletteService: PaletteRegistry;
  palettes: KbnPalettes;
  yAxis?: GroupsConfiguration[number];
  xAxis?: GroupsConfiguration[number];
  syncColors: boolean;
  timeZone: string;
  emphasizeFitting?: boolean;
  fillOpacity?: number;
  formattedDatatableInfo: DatatableWithFormatInfo & { invertedRawValueMap: InvertedRawValueMap };
  defaultXScaleType: XScaleType;
  fieldFormats: LayersFieldFormats;
  uiState?: PersistedState;
  allYAccessors: Array<string | ExpressionValueVisDimension>;
  singleTable?: boolean;
  multipleLayersWithSplits: boolean;
  isDarkMode: boolean;
  pointVisibility?: PointVisibility;
}) => SeriesSpec;

type GetSeriesNameFn = (
  data: XYChartSeriesIdentifier,
  config: {
    splitAccessors: Array<string | ExpressionValueVisDimension>;
    accessorsCount: number;
    columns: Datatable['columns'];
    splitAccessorsFormats: LayerFieldFormats['splitSeriesAccessors'];
    alreadyFormattedColumns: Record<string, boolean>;
    columnToLabelMap: Record<string, string>;
    multipleLayersWithSplits: boolean;
  },
  titles: LayerAccessorsTitles
) => SeriesName;

type GetColorFn = (
  seriesIdentifier: XYChartSeriesIdentifier,
  config: {
    layer: CommonXYDataLayerConfig;
    colorAssignments: ColorAssignments;
    paletteService: PaletteRegistry;
    getSeriesNameFn: (d: XYChartSeriesIdentifier) => SeriesName;
    syncColors?: boolean;
  },
  uiState?: PersistedState,
  singleTable?: boolean
) => string | null;

type GetPointConfigFn = (config: {
  xAccessor: string | undefined;
  markSizeAccessor: string | undefined;
  showPoints?: boolean;
  pointVisibility?: PointVisibility;
  pointsRadius?: number;
}) => Partial<AreaSeriesStyle['point']>;

type GetLineConfigFn = (config: {
  showLines?: boolean;
  lineWidth?: number;
}) => Partial<AreaSeriesStyle['line']>;

export const getFormattedTablesByLayers = (
  layers: CommonXYDataLayerConfig[],
  formatFactory: FormatFactory,
  splitColumnAccessor?: string | ExpressionValueVisDimension,
  splitRowAccessor?: string | ExpressionValueVisDimension
): Record<string, DatatableWithFormatInfo & { invertedRawValueMap: InvertedRawValueMap }> =>
  layers.reduce(
    (
      formattedDatatables,
      { layerId, table, xAccessor, splitAccessors = [], accessors: yAccessors, xScaleType }
    ) => {
      const accessors = [
        xAccessor,
        ...splitAccessors,
        ...yAccessors,
        splitColumnAccessor,
        splitRowAccessor,
      ].filter((a): a is string | ExpressionValueVisDimension => a !== undefined);
      console.log({
        table,
        splitAccessors,
        splitColumnAccessor,
        splitRowAccessor,
        xAccessor,
        yAccessors,
      });
      const invertedRawValueMap: InvertedRawValueMap = new Map(
        table.columns.map((c) => [c.id, new Map<string, RawValue>()])
      );

      const xAccessorId = xAccessor ? getAccessorByDimension(xAccessor, table.columns) : undefined;
      const splitAccessorsIds = splitAccessors.map((a) => getAccessorByDimension(a, table.columns));
      const splitColumnAccessorId = splitColumnAccessor
        ? getAccessorByDimension(splitColumnAccessor, table.columns)
        : undefined;
      const splitRowAccessorId = splitRowAccessor
        ? getAccessorByDimension(splitRowAccessor, table.columns)
        : undefined;

      const formattedTable = getFormattedTable(
        table,
        (columnId) => {
          // format only categorical X values, or split/slice values
          return (
            (xScaleType === 'ordinal' && xAccessorId === xAccessor) ||
            splitAccessorsIds.includes(columnId) ||
            columnId === splitColumnAccessorId ||
            columnId === splitRowAccessorId
          );
        },
        (id, meta) => {
          const accessor = accessors.find((a) => getAccessorByDimension(a, table.columns) === id);
          console.log(JSON.stringify({ id, meta, accessor }, null, 2));
          return formatFactory(accessor ? getFormat(table.columns, accessor) : meta.params);
        },
        (id, formattedValue, value) => invertedRawValueMap.get(id)?.set(formattedValue, value)
      );

      return {
        ...formattedDatatables,
        [layerId]: {
          ...formattedTable,
          invertedRawValueMap,
        },
      };
    },
    {}
  );

function getSplitValues(
  splitAccessorsMap: XYChartSeriesIdentifier['splitAccessors'],
  splitAccessors: Array<string | ExpressionValueVisDimension>,
  alreadyFormattedColumns: Record<string, boolean>,
  columns: Datatable['columns'],
  splitAccessorsFormats: LayerFieldFormats['splitSeriesAccessors']
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
      const splitFormatter = splitAccessorsFormats[splitColumnId].formatter;
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
    splitAccessorsFormats,
    alreadyFormattedColumns,
    columnToLabelMap,
    multipleLayersWithSplits,
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
    splitAccessorsFormats
  );

  const key = data.seriesKeys[data.seriesKeys.length - 1];
  const yAccessorTitle = columnToLabelMap[key] ?? titles?.yTitles?.[key] ?? null;

  if (accessorsCount > 1 || multipleLayersWithSplits) {
    if (splitValues.length === 0) {
      return yAccessorTitle;
    }
    return `${splitValues.join(' - ')}${yAccessorTitle ? ' - ' + yAccessorTitle : ''}`;
  }

  return splitValues.length > 0 ? splitValues.join(' - ') : yAccessorTitle;
};

const getPointConfig: GetPointConfigFn = ({
  markSizeAccessor,
  showPoints,
  pointVisibility,
  pointsRadius,
}) => {
  return {
    visible: pointVisibility ?? (showPoints || markSizeAccessor ? 'always' : 'auto'),
    radius: pointsRadius,
    fill: markSizeAccessor ? ColorVariant.Series : undefined,
  };
};

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
  { layer, colorAssignments, paletteService, syncColors, getSeriesNameFn },
  uiState,
  isSingleTable
) => {
  const overwriteColor = getSeriesColor(layer, series.yAccessor as string);
  if (overwriteColor !== null) {
    return overwriteColor;
  }

  const name = getSeriesNameFn(series)?.toString() || '';

  const overwriteColors: Record<string, string> = uiState?.get?.('vis.colors', {}) ?? {};

  if (Object.keys(overwriteColors).includes(name)) {
    return overwriteColors[name];
  }
  const colorAssignment = colorAssignments[layer.palette.name];

  const seriesLayers: SeriesLayer[] = [
    {
      name,
      totalSeriesAtDepth: colorAssignment.totalSeriesCount,
      rankAtDepth: colorAssignment.getRank(isSingleTable ? 'commonLayerId' : layer.layerId, name),
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
const SPLIT_CHAR = ':';
const SPLIT_Y_ACCESSORS = '|';

export const generateSeriesId = (
  { layerId }: Pick<CommonXYDataLayerConfig, 'layerId'>,
  splitColumnIds: string[],
  accessor?: string,
  xColumnId?: string
) =>
  [layerId, xColumnId ?? EMPTY_ACCESSOR, accessor ?? EMPTY_ACCESSOR, ...splitColumnIds].join(
    SPLIT_CHAR
  );

export const getMetaFromSeriesId = (seriesId: string) => {
  const [layerId, xAccessor, yAccessors, ...splitAccessors] = seriesId.split(SPLIT_CHAR);
  return {
    layerId,
    xAccessor: xAccessor === EMPTY_ACCESSOR ? undefined : xAccessor,
    yAccessors: yAccessors.split(SPLIT_Y_ACCESSORS),
    splitAccessor: splitAccessors[0] === EMPTY_ACCESSOR ? undefined : splitAccessors,
  };
};

export function hasMultipleLayersWithSplits(layers: CommonXYLayerConfig[]) {
  return layers.filter((l) => isDataLayer(l) && (l.splitAccessors?.length || 0) > 0).length > 1;
}

export const getSeriesProps: GetSeriesPropsFn = ({
  layer,
  titles = {},
  accessor,
  chartHasMoreThanOneBarSeries,
  colorAssignments,
  formatFactory,
  columnToLabelMap,
  paletteService,
  palettes,
  syncColors,
  yAxis,
  xAxis,
  timeZone,
  emphasizeFitting,
  fillOpacity,
  formattedDatatableInfo,
  defaultXScaleType,
  fieldFormats,
  uiState,
  allYAccessors,
  singleTable,
  multipleLayersWithSplits,
  isDarkMode,
  pointVisibility,
}): SeriesSpec => {
  const { table, isStacked, markSizeAccessor } = layer;
  const isPercentage = layer.isPercentage;
  let stackMode: StackMode | undefined = isPercentage ? AxisModes.PERCENTAGE : undefined;
  if (yAxis?.mode) {
    stackMode = yAxis?.mode === AxisModes.NORMAL ? undefined : yAxis?.mode;
  }
  const yScaleType = yAxis?.scaleType || ScaleType.Linear;
  const isBarChart = layer.seriesType === SeriesTypes.BAR;
  const xColumnId =
    layer.xAccessor !== undefined
      ? getAccessorByDimension(layer.xAccessor, table.columns)
      : undefined;
  const splitColumnIds =
    layer.splitAccessors?.map((splitAccessor) => {
      return getAccessorByDimension(splitAccessor, table.columns);
    }) || [];
  const enableHistogramMode =
    layer.isHistogram &&
    (isStacked || !splitColumnIds.length) &&
    (isStacked || !isBarChart || !chartHasMoreThanOneBarSeries);

  const formatter = table?.columns.find(
    (column) => column.id === (Array.isArray(accessor) ? accessor[0] : accessor)
  )?.meta?.params;

  const markSizeColumnId = markSizeAccessor
    ? getAccessorByDimension(markSizeAccessor, table.columns)
    : undefined;

  const markFormatter = formatFactory(
    markSizeAccessor ? getFormat(table.columns, markSizeAccessor) : undefined
  );

  const { table: formattedTable, formattedColumns, invertedRawValueMap } = formattedDatatableInfo;

  // For date histogram chart type, we're getting the rows that represent intervals without data.
  // To not display them in the legend, they need to be filtered out.
  let rows = formattedTable.rows.filter(
    (row) =>
      !(xColumnId && row[xColumnId] === undefined) &&
      !(
        splitColumnIds.some((splitColumnId) => row[splitColumnId] === undefined) &&
        (Array.isArray(accessor)
          ? accessor.some((a) => row[a] === undefined)
          : row[accessor] === undefined)
      )
  );

  const emptyX: Record<string, string> = {
    unifiedX: '',
  };

  if (!xColumnId) {
    rows = rows.map((row) => ({
      ...row,
      ...emptyX,
    }));
  }

  const getSeriesNameFn = (d: XYChartSeriesIdentifier) => {
    const name = getSeriesName(
      d,
      {
        splitAccessors: layer.splitAccessors || [],
        accessorsCount: singleTable ? allYAccessors.length : layer.accessors.length,
        alreadyFormattedColumns: formattedColumns,
        columns: formattedTable.columns,
        splitAccessorsFormats: fieldFormats[layer.layerId].splitSeriesAccessors,
        columnToLabelMap,
        multipleLayersWithSplits,
      },
      titles
    );
    console.log({ d, name });
    return name;
  };

  const colorAccessorFn: SeriesColorAccessorFn =
    // if colorMapping exist then we can apply it, if not let's use the legacy coloring method
    layer.colorMapping && splitColumnIds.length > 0
      ? getColorSeriesAccessorFn(
          JSON.parse(layer.colorMapping), // the color mapping is at this point just a stringified JSON
          invertedRawValueMap,
          palettes,
          isDarkMode,
          {
            type: 'categories',
            categories: getColorCategories(table.rows, splitColumnIds[0]),
          },
          splitColumnIds[0]
        )
      : (series) =>
          getColor(
            series,
            {
              layer,
              colorAssignments,
              paletteService,
              getSeriesNameFn,
              syncColors,
            },
            uiState,
            singleTable
          );

  return {
    splitSeriesAccessors: splitColumnIds.length ? splitColumnIds : [],
    stackAccessors: isStacked ? [xColumnId || 'unifiedX'] : [],
    id: generateSeriesId(
      layer,
      splitColumnIds.length ? splitColumnIds : [EMPTY_ACCESSOR],
      Array.isArray(accessor) ? accessor.join(SPLIT_Y_ACCESSORS) : accessor,
      xColumnId
    ),
    xAccessor: xColumnId || 'unifiedX',
    yAccessors: Array.isArray(accessor) ? accessor : [accessor],
    markSizeAccessor: markSizeColumnId,
    markFormat: (value) => markFormatter.convert(value),
    data: rows,
    xScaleType: xColumnId ? layer.xScaleType ?? defaultXScaleType : 'ordinal',
    yScaleType:
      formatter?.id === 'bytes' && yScaleType === ScaleType.Linear
        ? ScaleType.LinearBinary
        : yScaleType,
    color: colorAccessorFn,
    groupId: yAxis?.groupId,
    enableHistogramMode,
    stackMode,
    timeZone,
    areaSeriesStyle: {
      point: getPointConfig({
        xAccessor: xColumnId,
        markSizeAccessor: markSizeColumnId,
        showPoints: layer.showPoints,
        pointVisibility,
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
        showPoints: layer.showPoints,
        pointVisibility,
        pointsRadius: layer.pointsRadius,
      }),
      ...(emphasizeFitting && { fit: { line: getFitLineConfig() } }),
      line: getLineConfig({ lineWidth: layer.lineWidth, showLines: layer.showLines }),
    },
    name(d) {
      return getSeriesNameFn(d);
    },
    yNice: Boolean(yAxis?.extent?.niceValues),
    xNice: Boolean(xAxis?.extent?.niceValues),
  };
};
