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

import { Vis } from '../../visualizations/public';
import { buildExpression, buildExpressionFunction } from '../../expressions/public';
import {
  EsaggsExpressionFunctionDefinition,
  IndexPatternLoadExpressionFunctionDefinition,
} from '../../data/public';

import { PieVisParams } from './pie';
import { BasicVislibParams } from './types';

/**
 * Get esaggs expressions function
 * @param vis
 */
export function getEsaggsFn(vis: Vis<PieVisParams> | Vis<BasicVislibParams>) {
  return buildExpressionFunction<EsaggsExpressionFunctionDefinition>('esaggs', {
    index: buildExpression([
      buildExpressionFunction<IndexPatternLoadExpressionFunctionDefinition>('indexPatternLoad', {
        id: vis.data.indexPattern!.id!,
      }),
    ]),
    metricsAtAllLevels: vis.isHierarchical(),
    partialRows: false,
    aggs: vis.data.aggs!.aggs.map((agg) => buildExpression(agg.toExpressionAst())),
  });
}
