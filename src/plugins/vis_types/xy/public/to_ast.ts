/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';

import {
  VisToExpressionAst,
  getVisSchemas,
  DateHistogramParams,
  HistogramParams,
  DEFAULT_LEGEND_SIZE,
} from '@kbn/visualizations-plugin/public';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/public';
import { BUCKET_TYPES } from '@kbn/data-plugin/public';
import { Labels } from '@kbn/charts-plugin/public';

import { TimeRangeBounds } from '@kbn/data-plugin/common';
import {
  Dimensions,
  Dimension,
  VisParams,
  CategoryAxis,
  SeriesParam,
  ThresholdLine,
  ValueAxis,
  Scale,
  TimeMarker,
} from './types';
import { visName, VisTypeXyExpressionFunctionDefinition } from './expression_functions/xy_vis_fn';
import { XyVisType } from '../common';
import { getEsaggsFn } from './to_ast_esaggs';
import { getSeriesParams } from './utils/get_series_params';
import { getSafeId } from './utils/accessors';

const prepareLabel = (data: Labels) => {
  const label = buildExpressionFunction('label', {
    ...data,
  });

  return buildExpression([label]);
};

const prepareScale = (data: Scale) => {
  const scale = buildExpressionFunction('visscale', {
    ...data,
  });

  return buildExpression([scale]);
};

const prepareThresholdLine = (data: ThresholdLine) => {
  const thresholdLine = buildExpressionFunction('thresholdline', {
    ...data,
  });

  return buildExpression([thresholdLine]);
};

const prepareTimeMarker = (data: TimeMarker) => {
  const timeMarker = buildExpressionFunction('timemarker', {
    ...data,
  });

  return buildExpression([timeMarker]);
};

const prepareCategoryAxis = (data: CategoryAxis) => {
  const categoryAxis = buildExpressionFunction('categoryaxis', {
    id: data.id,
    show: data.show,
    position: data.position,
    type: data.type,
    title: data.title.text,
    scale: prepareScale(data.scale),
    labels: prepareLabel(data.labels),
  });

  return buildExpression([categoryAxis]);
};

const prepareValueAxis = (data: ValueAxis) => {
  const categoryAxis = buildExpressionFunction('valueaxis', {
    name: data.name,
    axisParams: prepareCategoryAxis({
      ...data,
    }),
  });

  return buildExpression([categoryAxis]);
};

const prepareSeriesParam = (data: SeriesParam) => {
  const seriesParam = buildExpressionFunction('seriesparam', {
    label: data.data.label,
    id: data.data.id,
    drawLinesBetweenPoints: data.drawLinesBetweenPoints,
    interpolate: data.interpolate,
    lineWidth: data.lineWidth,
    mode: data.mode,
    show: data.show,
    showCircles: data.showCircles,
    circlesRadius: data.circlesRadius,
    type: data.type,
    valueAxis: data.valueAxis,
  });

  return buildExpression([seriesParam]);
};

const prepareVisDimension = (data: Dimension) => {
  const visDimension = buildExpressionFunction('visdimension', { accessor: data.accessor });

  if (data.format) {
    visDimension.addArgument('format', data.format.id);
    visDimension.addArgument('formatParams', JSON.stringify(data.format.params));
  }

  return buildExpression([visDimension]);
};

const prepareXYDimension = (data: Dimension) => {
  const xyDimension = buildExpressionFunction('xydimension', {
    params: JSON.stringify(data.params),
    aggType: data.aggType,
    label: data.label,
    visDimension: prepareVisDimension(data),
  });

  return buildExpression([xyDimension]);
};

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

  if (dimensions.x) {
    const xAgg = responseAggs[dimensions.x.accessor] as any;
    if (xAgg.type.name === BUCKET_TYPES.DATE_HISTOGRAM) {
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

  const visTypeXy = buildExpressionFunction<VisTypeXyExpressionFunctionDefinition>(visName, {
    type: vis.type.name as XyVisType,
    chartType: vis.params.type,
    addTimeMarker: vis.params.addTimeMarker,
    truncateLegend: vis.params.truncateLegend,
    maxLegendLines: vis.params.maxLegendLines,
    legendSize: vis.params.legendSize ?? DEFAULT_LEGEND_SIZE,
    addLegend: vis.params.addLegend,
    addTooltip: vis.params.addTooltip,
    legendPosition: vis.params.legendPosition,
    orderBucketsBySum: vis.params.orderBucketsBySum,
    categoryAxes: vis.params.categoryAxes.map(prepareCategoryAxis),
    valueAxes: vis.params.valueAxes.map(prepareValueAxis),
    seriesParams: finalSeriesParams.map(prepareSeriesParam),
    labels: prepareLabel(vis.params.labels),
    thresholdLine: prepareThresholdLine(vis.params.thresholdLine),
    gridCategoryLines: vis.params.grid.categoryLines,
    gridValueAxis: vis.params.grid.valueAxis,
    radiusRatio: vis.params.radiusRatio,
    isVislibVis: vis.params.isVislibVis,
    detailedTooltip: vis.params.detailedTooltip,
    fittingFunction: vis.params.fittingFunction,
    times: vis.params.times.map(prepareTimeMarker),
    palette: vis.params.palette.name,
    fillOpacity: vis.params.fillOpacity,
    xDimension: dimensions.x ? prepareXYDimension(dimensions.x) : null,
    yDimension: dimensions.y.map(prepareXYDimension),
    zDimension: dimensions.z?.map(prepareXYDimension),
    widthDimension: dimensions.width?.map(prepareXYDimension),
    seriesDimension: dimensions.series?.map(prepareXYDimension),
    splitRowDimension: dimensions.splitRow?.map(prepareXYDimension),
    splitColumnDimension: dimensions.splitColumn?.map(prepareXYDimension),
  });

  const ast = buildExpression([getEsaggsFn(vis), visTypeXy]);

  return ast.toAst();
};
