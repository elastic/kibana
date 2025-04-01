/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { LegendValue, Position, ScaleType as ECScaleType } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import {
  VisToExpressionAst,
  getVisSchemas,
  DateHistogramParams,
  HistogramParams,
  LegendSize,
} from '@kbn/visualizations-plugin/public';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/public';
import { BUCKET_TYPES } from '@kbn/data-plugin/public';
import type { TimeRangeBounds } from '@kbn/data-plugin/common';
import type { PaletteOutput } from '@kbn/charts-plugin/common/expressions/palette/types';
import {
  Dimensions,
  Dimension,
  VisParams,
  CategoryAxis,
  SeriesParam,
  ThresholdLine,
  ValueAxis,
  Scale,
  ChartMode,
  ScaleType,
} from './types';
import { ChartType } from '../common';
import { getSeriesParams } from './utils/get_series_params';
import { getSafeId } from './utils/accessors';
import { Bounds, getCurveType, getLineStyle, getMode, getYAxisPosition } from './utils/common';

type YDimension = Omit<Dimension, 'accessor'> & { accessor: string };

const prepareLengend = (params: VisParams, legendSize?: LegendSize) => {
  const legend = buildExpressionFunction('legendConfig', {
    isVisible: params.addLegend,
    maxLines: params.maxLegendLines,
    position: params.legendPosition,
    shouldTruncate: params.truncateLegend,
    showSingleSeries: true,
    legendSize,
    legendStats: params.labels.show ? [LegendValue.CurrentAndLastValue] : undefined,
  });

  return buildExpression([legend]);
};

const getCorrectAccessor = (yAccessor: Dimension | YDimension, aggId: string) => {
  return typeof yAccessor.accessor === 'number'
    ? `col-${yAccessor.accessor}-${aggId}`
    : yAccessor.accessor;
};

const prepareDecoration = (axisId: string, yAccessor: YDimension, aggId: string) => {
  const dataDecorationConfig = buildExpressionFunction('dataDecorationConfig', {
    forAccessor: getCorrectAccessor(yAccessor, aggId),
    axisId,
  });

  return buildExpression([dataDecorationConfig]);
};

const preparePalette = (palette: PaletteOutput) => {
  const paletteExp = buildExpressionFunction(
    palette.name === 'custom' ? 'palette' : 'system_palette',
    palette.name === 'custom'
      ? { ...palette.params }
      : {
          name: palette.name,
        }
  );

  return buildExpression([paletteExp]);
};

const prepareLayers = (
  seriesParam: SeriesParam,
  isHistogram: boolean,
  valueAxes: ValueAxis[],
  yAccessors: YDimension[],
  xAccessor: Dimension | null,
  splitAccessors?: Dimension[],
  markSizeAccessor?: Dimension,
  palette?: PaletteOutput,
  xScale?: Scale
) => {
  // valueAxis.position !== Position.Left
  const isHorizontal = valueAxes.some((valueAxis) => {
    return (
      seriesParam.valueAxis === valueAxis.id &&
      valueAxis.position !== Position.Left &&
      valueAxis.position !== Position.Right
    );
  });
  const isBar = seriesParam.type === ChartType.Histogram;
  const dataLayer = buildExpressionFunction('extendedDataLayer', {
    seriesType: isBar ? 'bar' : seriesParam.type,
    isHistogram,
    isHorizontal,
    isStacked: seriesParam.mode === ChartMode.Stacked,
    lineWidth: !isBar ? seriesParam.lineWidth : undefined,
    showPoints: !isBar ? seriesParam.showCircles : undefined,
    pointsRadius: !isBar ? seriesParam.circlesRadius ?? 3 : undefined,
    showLines: !isBar ? seriesParam.drawLinesBetweenPoints : undefined,
    curveType: getCurveType(seriesParam.interpolate),
    decorations: yAccessors.map((accessor) =>
      prepareDecoration(seriesParam.valueAxis, accessor, seriesParam.data.id)
    ),
    accessors: yAccessors.map((accessor) => prepareVisDimension(accessor)),
    xAccessor: xAccessor ? prepareVisDimension(xAccessor) : 'all',
    xScaleType: getScaleType(
      xScale,
      xAccessor?.format?.id === 'number' ||
        (xAccessor?.format?.params?.id === 'number' &&
          xAccessor?.format?.id !== BUCKET_TYPES.RANGE &&
          xAccessor?.format?.id !== BUCKET_TYPES.TERMS),
      'date' in (xAccessor?.params || {}),
      'interval' in (xAccessor?.params || {})
    ),
    splitAccessors: splitAccessors ? splitAccessors.map(prepareVisDimension) : undefined,
    markSizeAccessor:
      markSizeAccessor && !isBar ? prepareVisDimension(markSizeAccessor) : undefined,
    palette: palette ? preparePalette(palette) : undefined,
    columnToLabel: JSON.stringify(
      [...yAccessors, xAccessor, ...(splitAccessors ?? [])].reduce<Record<string, string>>(
        (acc, dimension) => {
          if (dimension) {
            acc[getCorrectAccessor(dimension, seriesParam.data.id)] = dimension.label;
          }

          return acc;
        },
        {}
      )
    ),
  });

  return buildExpression([dataLayer]);
};

const getLabelArgs = (data: CategoryAxis, isTimeChart?: boolean) => {
  return {
    truncate: data.labels.truncate,
    labelsOrientation: -(data.labels.rotate ?? (isTimeChart ? 0 : 90)),
    showOverlappingLabels: data.labels.filter === false,
    showDuplicates: data.labels.filter === false,
    labelColor: data.labels.color,
    showLabels: data.labels.show,
  };
};

const prepareAxisExtentConfig = (scale: Scale, bounds?: Bounds) => {
  const axisExtentConfig = buildExpressionFunction('axisExtentConfig', {
    mode: getMode(scale, bounds),
    lowerBound: bounds?.min || scale.min,
    upperBound: bounds?.max || scale.max,
    enforce: true,
  });

  return buildExpression([axisExtentConfig]);
};

function getScaleType(
  scale?: Scale,
  isNumber?: boolean,
  isTime = false,
  isHistogram = false
): ECScaleType | undefined {
  if (isTime) return ECScaleType.Time;
  if (isHistogram) return ECScaleType.Linear;

  if (!isNumber) {
    return ECScaleType.Ordinal;
  }

  const type = scale?.type;
  if (type === ScaleType.SquareRoot) {
    return ECScaleType.Sqrt;
  }

  return type;
}

function getXAxisPosition(position: Position) {
  if (position === Position.Left) {
    return Position.Bottom;
  }

  if (position === Position.Right) {
    return Position.Top;
  }

  return position;
}

const prepareXAxis = (
  data: CategoryAxis,
  showGridLines?: boolean,
  bounds?: Bounds,
  isTimeChart?: boolean
) => {
  const xAxisConfig = buildExpressionFunction('xAxisConfig', {
    hide: !data.show,
    position: getXAxisPosition(data.position),
    title: data.title.text,
    extent: prepareAxisExtentConfig(data.scale, bounds),
    showGridLines,
    ...getLabelArgs(data, isTimeChart),
  });

  return buildExpression([xAxisConfig]);
};

const prepareYAxis = (data: ValueAxis, showGridLines?: boolean) => {
  const yAxisConfig = buildExpressionFunction('yAxisConfig', {
    id: data.id,
    hide: !data.show,
    position: getYAxisPosition(data.position),
    title: data.title.text,
    extent: prepareAxisExtentConfig(data.scale),
    boundsMargin: data.scale.boundsMargin,
    scaleType: getScaleType(data.scale, true),
    mode: data.scale.mode,
    showGridLines,
    ...getLabelArgs(data),
  });

  return buildExpression([yAxisConfig]);
};

const prepareReferenceLine = (thresholdLine: ThresholdLine, axisId: string) => {
  const referenceLine = buildExpressionFunction('referenceLine', {
    value: thresholdLine.value,
    color: thresholdLine.color,
    lineWidth: thresholdLine.width,
    lineStyle: getLineStyle(thresholdLine.style),
    axisId,
  });

  return buildExpression([referenceLine]);
};

const prepareVisDimension = (data: Dimension | YDimension) => {
  const visDimension = buildExpressionFunction('visdimension', { accessor: data.accessor });

  if (data.format) {
    visDimension.addArgument('format', data.format.id);
    visDimension.addArgument('formatParams', JSON.stringify(data.format.params));
  }

  return buildExpression([visDimension]);
};

export const isDateHistogramParams = (params: Dimension['params']): params is DateHistogramParams =>
  (params as DateHistogramParams).date;

export const toExpressionAst: VisToExpressionAst<VisParams> = async (vis, params) => {
  const schemas = getVisSchemas(vis, params);
  const dimensions: Dimensions = {
    x: schemas.segment ? schemas.segment[0] : null,
    y: schemas.metric,
    z: schemas.radius,
    width: schemas.width,
    series: schemas.group,
    splitRow: schemas.split_row,
    splitColumn: schemas.split_column,
  };

  const responseAggs = vis.data.aggs?.getResponseAggs().filter(({ enabled }) => enabled) ?? [];

  const schemaName = vis.type.schemas?.metrics[0].name;
  const firstValueAxesId = vis.params.valueAxes[0].id;
  const updatedSeries = getSeriesParams(
    vis.data.aggs,
    vis.params.seriesParams,
    schemaName,
    firstValueAxesId
  );

  const finalSeriesParams = updatedSeries ?? vis.params.seriesParams;

  let isHistogram = false;

  if (dimensions.x) {
    const xAgg = responseAggs[dimensions.x.accessor] as any;
    if (xAgg.type.name === BUCKET_TYPES.DATE_HISTOGRAM) {
      isHistogram = true;
      (dimensions.x.params as DateHistogramParams).date = true;
      const { esUnit, esValue } = xAgg.buckets.getInterval();
      (dimensions.x.params as DateHistogramParams).intervalESUnit = esUnit;
      (dimensions.x.params as DateHistogramParams).intervalESValue = esValue;
      (dimensions.x.params as DateHistogramParams).interval = moment
        .duration(esValue, esUnit)
        .asMilliseconds();
      (dimensions.x.params as DateHistogramParams).format = xAgg.buckets.getScaledDateFormat();
      const bounds = xAgg.buckets.getBounds() as TimeRangeBounds | undefined;

      if (bounds && bounds?.min && bounds?.max) {
        (dimensions.x.params as DateHistogramParams).bounds = {
          min: bounds.min.valueOf(),
          max: bounds.max.valueOf(),
        };
      }
    } else if (xAgg.type.name === BUCKET_TYPES.HISTOGRAM) {
      isHistogram = true;
      const intervalParam = xAgg.type.paramByName('interval');
      const output = { params: {} as any };
      await intervalParam.modifyAggConfigOnSearchRequestStart(xAgg, vis.data.searchSource, {
        abortSignal: params.abortSignal,
      });
      intervalParam.write(xAgg, output);
      (dimensions.x.params as HistogramParams).interval = output.params.interval;
    }
  }

  (dimensions.y || []).forEach((yDimension) => {
    const yAgg = responseAggs[yDimension.accessor];
    const aggId = getSafeId(yAgg.id);
    const seriesParam = (vis.params.seriesParams || []).find(
      (param: any) => param.data.id === aggId
    );
    if (seriesParam) {
      const usedValueAxis = (vis.params.valueAxes || []).find(
        (valueAxis: any) => valueAxis.id === seriesParam.valueAxis
      );
      if (usedValueAxis?.scale.mode === 'percentage') {
        yDimension.format = { id: 'percent' };
      }
    }
  });

  let legendSize = vis.params.legendSize;

  if (vis.params.legendPosition === Position.Top || vis.params.legendPosition === Position.Bottom) {
    legendSize = LegendSize.AUTO;
  }

  const yAccessors = (dimensions.y || []).reduce<Record<string, YDimension[]>>(
    (acc, yDimension) => {
      const yAgg = responseAggs[yDimension.accessor];
      const aggId = getSafeId(yAgg.id);
      const dimension: YDimension = {
        ...yDimension,
        accessor: getCorrectAccessor(yDimension, yAgg.id),
      };
      if (acc[aggId]) {
        acc[aggId].push(dimension);
      } else {
        acc[aggId] = [dimension];
      }
      return acc;
    },
    {}
  );

  const xScale = vis.params.categoryAxes[0].scale;

  let mapColumn;

  if (!dimensions.x) {
    mapColumn = buildExpressionFunction('mapColumn', {
      id: 'all',
      expression: '_all',
      name: i18n.translate('visTypeXy.allDocsTitle', {
        defaultMessage: 'All docs',
      }),
    });
  }

  const visibleSeries = finalSeriesParams.filter(
    (param) => param.show && yAccessors[param.data.id]
  );

  const visTypeXy = buildExpressionFunction('layeredXyVis', {
    layers: [
      ...visibleSeries.map((seriesParams) =>
        prepareLayers(
          seriesParams,
          isHistogram,
          vis.params.valueAxes,
          yAccessors[seriesParams.data.id],
          dimensions.x,
          dimensions.series,
          dimensions.z ? dimensions.z[0] : undefined,
          vis.params.palette,
          xScale
        )
      ),
      ...(vis.params.thresholdLine.show
        ? [prepareReferenceLine(vis.params.thresholdLine, vis.params.valueAxes[0].id)]
        : []),
    ],
    addTimeMarker: vis.params.addTimeMarker && (dimensions.x?.params as DateHistogramParams)?.date,
    orderBucketsBySum: vis.params.orderBucketsBySum,
    fittingFunction: vis.params.fittingFunction
      ? vis.params.fittingFunction.charAt(0).toUpperCase() + vis.params.fittingFunction.slice(1)
      : undefined,
    detailedTooltip: vis.params.detailedTooltip,
    fillOpacity: vis.params.fillOpacity,
    showTooltip: vis.params.addTooltip,
    markSizeRatio:
      dimensions.z &&
      visibleSeries.some((param) => param.type === ChartType.Area || param.type === ChartType.Line)
        ? vis.params.radiusRatio * 0.6 // NOTE: downscale ratio to match current vislib implementation
        : undefined,
    legend: prepareLengend(vis.params, legendSize),
    xAxisConfig: prepareXAxis(
      vis.params.categoryAxes[0],
      vis.params.grid.categoryLines,
      dimensions.x?.params && isDateHistogramParams(dimensions.x?.params)
        ? dimensions.x?.params.bounds
        : undefined,
      dimensions.x?.params && isDateHistogramParams(dimensions.x?.params)
        ? dimensions.x?.params.date
        : undefined
    ), // as we have only one x axis
    yAxisConfigs: vis.params.valueAxes
      .filter((axis) => visibleSeries.some((seriesParam) => seriesParam.valueAxis === axis.id))
      .map((valueAxis) => prepareYAxis(valueAxis, vis.params.grid.valueAxis === valueAxis.id)),
    minTimeBarInterval:
      dimensions.x?.params &&
      isDateHistogramParams(dimensions.x?.params) &&
      dimensions.x?.params.date &&
      visibleSeries.some((param) => param.type === ChartType.Histogram)
        ? dimensions.x?.params.intervalESValue + dimensions.x?.params.intervalESUnit
        : undefined,
    splitColumnAccessor: dimensions.splitColumn?.map(prepareVisDimension),
    splitRowAccessor: dimensions.splitRow?.map(prepareVisDimension),
    valueLabels: vis.params.labels.show ? 'show' : 'hide',
    singleTable: true,
  });

  const ast = buildExpression(mapColumn ? [mapColumn, visTypeXy] : [visTypeXy]);

  return ast.toAst();
};
