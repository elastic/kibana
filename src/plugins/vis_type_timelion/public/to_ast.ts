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
import { TimelionExpressionFunctionDefinition, TimelionVisParams } from './timelion_vis_fn';

const escapeString = (data: string): string => {
  return data.replace(/\\/g, `\\\\`).replace(/'/g, `\\'`);
};

export const toExpressionAst = (vis: Vis<TimelionVisParams>) => {
  const timelion = buildExpressionFunction<TimelionExpressionFunctionDefinition>('timelion_vis', {
    expression: escapeString(vis.params.expression),
    interval: escapeString(vis.params.interval),
  });

  const ast = buildExpression([timelion]);

  return ast.toAst();
};
