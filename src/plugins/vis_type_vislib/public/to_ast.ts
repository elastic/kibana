/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import moment from 'moment';
import { get } from 'lodash';

import { Vis, VisToExpressionAst } from '../../visualizations/public';
import { buildExpression, buildExpressionFunction } from '../../expressions/public';
import { EsaggsExpressionFunctionDefinition } from '../../data/public';
import { Dimensions, DateHistogramParams, HistogramParams } from '../../vis_type_xy/public';

import { VisTypeVislibExpressionFunctionDefinition } from './vis_type_vislib_vis_fn';
import { VisTypeVislibPieExpressionFunctionDefinition } from './pie_fn';
import { BasicVislibParams } from './types';

export const toExpressionAst: VisToExpressionAst<BasicVislibParams> = async (
  vis,
  params,
  schemas
) => {
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

  if (dimensions.x) {
    const xAgg = responseAggs[dimensions.x.accessor] as any;
    if (xAgg.type.name === 'date_histogram') {
      (dimensions.x.params as DateHistogramParams).date = true;
      const { esUnit, esValue } = xAgg.buckets.getInterval();
      (dimensions.x.params as DateHistogramParams).interval = moment
        .duration(esValue, esUnit)
        .asMilliseconds();
      (dimensions.x.params as DateHistogramParams).format = xAgg.buckets.getScaledDateFormat();
      (dimensions.x.params as DateHistogramParams).bounds = xAgg.buckets.getBounds();
    } else if (xAgg.type.name === 'histogram') {
      const intervalParam = xAgg.type.paramByName('interval');
      const output = { params: {} as any };
      await intervalParam.modifyAggConfigOnSearchRequestStart(xAgg, vis.data.searchSource, {
        abortSignal: params.abortSignal,
      });
      intervalParam.write(xAgg, output);
      (dimensions.x.params as HistogramParams).interval = output.params.interval;
    }
  }

  const visConfig = vis.params;

  (dimensions.y || []).forEach((yDimension) => {
    const yAgg = responseAggs[yDimension.accessor];
    const seriesParam = (visConfig.seriesParams || []).find(
      (param: any) => param.data.id === yAgg.id
    );
    if (seriesParam) {
      const usedValueAxis = (visConfig.valueAxes || []).find(
        (valueAxis: any) => valueAxis.id === seriesParam.valueAxis
      );
      if (get(usedValueAxis, 'scale.mode') === 'percentage') {
        yDimension.format = { id: 'percent' };
      }
    }
    if (get(visConfig, 'gauge.percentageMode') === true) {
      yDimension.format = { id: 'percent' };
    }
  });

  visConfig.dimensions = dimensions;
  const type = vis.type.name === 'pie' ? { type: vis.type.name } : {};

  const configStr = JSON.stringify(visConfig).replace(/\\/g, `\\\\`).replace(/'/g, `\\'`);
  const visTypeXy = buildExpressionFunction<
    VisTypeVislibExpressionFunctionDefinition | VisTypeVislibPieExpressionFunctionDefinition
  >('vislib', {
    ...type,
    visConfig: configStr,
  });

  const ast = buildExpression([getEsaggsFn(vis), visTypeXy]);

  return ast.toAst();
};

/**
 * Get esaggs expressions function
 * @param vis
 */
function getEsaggsFn(vis: Vis<BasicVislibParams & { showPartialRows?: any }>) {
  // soon this becomes: const esaggs = vis.data.aggs!.toExpressionAst();
  return buildExpressionFunction<EsaggsExpressionFunctionDefinition>('esaggs', {
    index: vis.data.indexPattern!.id!,
    metricsAtAllLevels: vis.isHierarchical(),
    partialRows: vis.params.showPartialRows ?? false,
    aggConfigs: JSON.stringify(vis.data.aggs!.aggs),
    includeFormatHints: false,
  });
}
