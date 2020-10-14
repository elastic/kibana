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

import { Vis, VisToExpressionAst } from '../../visualizations/public';
import { EsaggsExpressionFunctionDefinition } from '../../data/public';
import { buildExpression, buildExpressionFunction } from '../../expressions/public';

import { PieVisParams } from './pie';
import { vislibPieName, VisTypeVislibPieExpressionFunctionDefinition } from './pie_fn';

export const toExpressionAst: VisToExpressionAst<PieVisParams> = async (vis, params, schemas) => {
  const visConfig = {
    ...vis.params,
    dimensions: {
      metric: schemas.metric[0],
      buckets: schemas.segment,
      splitRow: schemas.split_row,
      splitColumn: schemas.split_column,
    },
  };

  const configStr = JSON.stringify(visConfig).replace(/\\/g, `\\\\`).replace(/'/g, `\\'`);
  const visTypePie = buildExpressionFunction<VisTypeVislibPieExpressionFunctionDefinition>(
    vislibPieName,
    {
      visConfig: configStr,
    }
  );

  const ast = buildExpression([getEsaggsFn(vis), visTypePie]);

  return ast.toAst();
};

/**
 * Get esaggs expressions function
 * @param vis
 */
function getEsaggsFn(vis: Vis<PieVisParams & { showPartialRows?: any }>) {
  // soon this becomes: const esaggs = vis.data.aggs!.toExpressionAst();
  return buildExpressionFunction<EsaggsExpressionFunctionDefinition>('esaggs', {
    index: vis.data.indexPattern!.id!,
    metricsAtAllLevels: vis.isHierarchical(),
    partialRows: vis.params.showPartialRows ?? false,
    aggConfigs: JSON.stringify(vis.data.aggs!.aggs),
    includeFormatHints: false,
  });
}
