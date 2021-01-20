/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import moment from 'moment';

import { VisToExpressionAst, getVisSchemas } from '../../visualizations/public';
import { buildExpression, buildExpressionFunction } from '../../expressions/public';
import type { Dimensions, DateHistogramParams, HistogramParams } from '../../vis_type_xy/public';
import { BUCKET_TYPES } from '../../data/public';

import { vislibVisName, VisTypeVislibExpressionFunctionDefinition } from './vis_type_vislib_vis_fn';
import { BasicVislibParams, VislibChartType } from './types';
import { getEsaggsFn } from './to_ast_esaggs';

export const toExpressionAst: VisToExpressionAst<BasicVislibParams> = async (vis, params) => {
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

  const visConfig = { ...vis.params };

  (dimensions.y || []).forEach((yDimension) => {
    const yAgg = responseAggs.filter(({ enabled }) => enabled)[yDimension.accessor];
    const seriesParam = (visConfig.seriesParams || []).find((param) => param.data.id === yAgg.id);
    if (seriesParam) {
      const usedValueAxis = (visConfig.valueAxes || []).find(
        (valueAxis) => valueAxis.id === seriesParam.valueAxis
      );
      if (usedValueAxis?.scale.mode === 'percentage') {
        yDimension.format = { id: 'percent' };
      }
    }
    if (visConfig?.gauge?.percentageMode === true) {
      yDimension.format = { id: 'percent' };
    }
  });

  visConfig.dimensions = dimensions;

  const visTypeVislib = buildExpressionFunction<VisTypeVislibExpressionFunctionDefinition>(
    vislibVisName,
    {
      type: vis.type.name as Exclude<VislibChartType, 'pie'>,
      visConfig: JSON.stringify(visConfig),
    }
  );

  const ast = buildExpression([getEsaggsFn(vis), visTypeVislib]);

  return ast.toAst();
};
