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

import { VisToExpressionAst, getVisSchemas } from '../../visualizations/public';
import { buildExpression, buildExpressionFunction } from '../../expressions/public';

import { vislibVisName, VisTypeVislibExpressionFunctionDefinition } from './vis_type_vislib_vis_fn';
import { BasicVislibParams } from './types';
import {
  DateHistogramParams,
  Dimensions,
  HistogramParams,
} from './vislib/helpers/point_series/point_series';
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
    if (xAgg.type.name === 'date_histogram') {
      (dimensions.x.params as DateHistogramParams).date = true;
      const { esUnit, esValue } = xAgg.buckets.getInterval();
      (dimensions.x.params as DateHistogramParams).intervalESUnit = esUnit;
      (dimensions.x.params as DateHistogramParams).intervalESValue = esValue;
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

  const visTypeXy = buildExpressionFunction<VisTypeVislibExpressionFunctionDefinition>(
    vislibVisName,
    {
      type: vis.type.name,
      visConfig: JSON.stringify(visConfig),
    }
  );

  const ast = buildExpression([getEsaggsFn(vis), visTypeXy]);

  return ast.toAst();
};
