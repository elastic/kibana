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

import { ExpressionFunctionKibana, ExpressionFunctionKibanaContext } from '../../../data/public';
import { buildExpression, buildExpressionFunction } from '../../../expressions/public';

import { VisToExpressionAst } from '../types';

/**
 * Creates an ast expression for a visualization based on kibana context (query, filters, timerange)
 * including a saved search if the visualization is based on it.
 * The expression also includes particular visualization expression ast if presented.
 *
 * @internal
 */
export const toExpressionAst: VisToExpressionAst = async (vis, params) => {
  const { savedSearchId, searchSource } = vis.data;
  const query = searchSource?.getField('query');
  const filters = searchSource?.getField('filter');

  const kibana = buildExpressionFunction<ExpressionFunctionKibana>('kibana', {});
  const kibanaContext = buildExpressionFunction<ExpressionFunctionKibanaContext>('kibana_context', {
    q: query && JSON.stringify(query),
    filters: filters && JSON.stringify(filters),
    savedSearchId,
  });

  const ast = buildExpression([kibana, kibanaContext]);
  const expression = ast.toAst();

  if (!vis.type.toExpressionAst) {
    throw new Error('Visualization type definition should have toExpressionAst function defined');
  }

  const visExpressionAst = await vis.type.toExpressionAst(vis, params);
  // expand the expression chain with a particular visualization expression chain, if it exists
  expression.chain.push(...visExpressionAst.chain);

  return expression;
};
