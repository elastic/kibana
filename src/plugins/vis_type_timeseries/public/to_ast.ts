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

// const fun = ({ title, ...params }, schemas, uiState = {}) => {
//   const paramsJson = prepareJson('params', params);
//   const uiStateJson = prepareJson('uiState', uiState);

//   const paramsArray = [paramsJson, uiStateJson].filter((param) => Boolean(param));
//   return `tsvb ${paramsArray.join(' ')}`;
// };

export const toExpressionAst = (vis: Vis<any>) => {
  const timeseries = buildExpressionFunction<any>('tsvb', {
    params: JSON.stringify(vis.params).replace(/\\/g, `\\\\`).replace(/'/g, `\\'`),
  });

  const ast = buildExpression([timeseries]);

  return ast.toAst();
};
