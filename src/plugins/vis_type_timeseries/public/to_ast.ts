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

import { buildExpression, buildExpressionFunction } from '../../expressions/public';
import { Vis } from '../../visualizations/public';
import { TimeseriesExpressionFunctionDefinition } from './metrics_fn';

const prepareJson = (data: unknown) =>
  JSON.stringify(data).replace(/\\/g, `\\\\`).replace(/'/g, `\\'`);

export const toExpressionAst = (vis: Vis<any>) => {
  const params = prepareJson(vis.params);
  const uiState = prepareJson(vis.uiState);

  const timeseries = buildExpressionFunction<TimeseriesExpressionFunctionDefinition>('tsvb', {
    params,
    uiState,
  });

  const ast = buildExpression([timeseries]);

  return ast.toAst();
};
