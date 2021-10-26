/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';

import { VisToExpressionAst, getVisSchemas } from '../../../visualizations/public';
import { buildExpression, buildExpressionFunction } from '../../../expressions/public';
import type { DateHistogramParams, HistogramParams } from '../../../visualizations/public';
import type { Labels } from '../../../charts/public';

import { BUCKET_TYPES } from '../../../data/public';

import { vislibHeatmapName, ExpressionHeatmapFunction } from './heatmap_fn';
import type {
  Dimensions,
  Dimension,
  ValueAxis,
  CategoryAxis,
  Scale,
  HeatmapVisParams,
} from './types';
import { getEsaggsFn } from './to_ast_esaggs';

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

const prepareScale = (data: Scale) => {
  const scale = buildExpressionFunction('visscale', {
    ...data,
  });

  return buildExpression([scale]);
};

const prepareLabel = (data: Labels) => {
  const label = buildExpressionFunction('label', {
    ...data,
  });

  return buildExpression([label]);
};

const prepareCategoryAxis = (data: CategoryAxis) => {
  const categoryAxis = buildExpressionFunction('categoryaxis', {
    id: data.id,
    show: data.show,
    position: data?.position ?? 'bottom',
    type: data.type,
    title: data?.title?.text,
    scale: prepareScale(data.scale),
    labels: prepareLabel(data.labels),
  });

  return buildExpression([categoryAxis]);
};

const prepareValueAxis = (data: ValueAxis) => {
  const categoryAxis = buildExpressionFunction('valueaxis', {
    name: data.id,
    axisParams: prepareCategoryAxis({
      ...data,
    }),
  });

  return buildExpression([categoryAxis]);
};

export const toExpressionAst: VisToExpressionAst<HeatmapVisParams> = async (vis, params) => {
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

  const responseAggs = vis.data.aggs?.getResponseAggs() ?? [];

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
      (dimensions.x.params as DateHistogramParams).bounds = xAgg.buckets.getBounds();
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

  const args = {
    // explicitly pass each param to prevent extra values trapping
    addTooltip: vis.params.addTooltip,
    invertColors: vis.params.invertColors,
    enableHover: vis.params.enableHover,
    addLegend: vis.params.addLegend,
    legendPosition: vis.params.legendPosition,
    colorsNumber: vis.params.colorsNumber,
    colorSchema: vis.params.colorSchema,
    setColorRange: vis.params.setColorRange,
    percentageMode: vis.params.percentageMode,
    percentageFormatPattern: vis.params.percentageFormatPattern,
    valueAxes: vis.params.valueAxes.map(prepareValueAxis),
    categoryAxes: vis.params.categoryAxes.map(prepareCategoryAxis),
    // maxLegendLines: vis.params.maxLegendLines,
    palette: vis.params?.palette,
    xDimension: dimensions.x ? prepareXYDimension(dimensions.x) : null,
    yDimension: dimensions.y.map(prepareXYDimension),
    zDimension: dimensions.z?.map(prepareXYDimension),
    widthDimension: dimensions.width?.map(prepareXYDimension),
    seriesDimension: dimensions.series?.map(prepareXYDimension),
    splitRowDimension: dimensions.splitRow?.map(prepareXYDimension),
    splitColumnDimension: dimensions.splitColumn?.map(prepareXYDimension),
  };

  const visTypeHeatmap = buildExpressionFunction<ExpressionHeatmapFunction>(
    vislibHeatmapName,
    args
  );

  const ast = buildExpression([getEsaggsFn(vis), visTypeHeatmap]);

  return ast.toAst();
};
