/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  EsaggsExpressionFunctionDefinition,
  IndexPatternLoadExpressionFunctionDefinition,
} from '../../data/public';
import { buildExpression, buildExpressionFunction } from '../../expressions/public';
import { getVisSchemas, Vis, BuildPipelineParams } from '../../visualizations/public';
import { RegionMapExpressionFunctionDefinition } from './region_map_fn';
import { RegionMapVisConfig, RegionMapVisParams } from './region_map_types';

export const toExpressionAst = (vis: Vis<RegionMapVisParams>, params: BuildPipelineParams) => {
  const esaggs = buildExpressionFunction<EsaggsExpressionFunctionDefinition>('esaggs', {
    index: buildExpression([
      buildExpressionFunction<IndexPatternLoadExpressionFunctionDefinition>('indexPatternLoad', {
        id: vis.data.indexPattern!.id!,
      }),
    ]),
    metricsAtAllLevels: false,
    partialRows: false,
    aggs: vis.data.aggs!.aggs.map((agg) => buildExpression(agg.toExpressionAst())),
  });

  const schemas = getVisSchemas(vis, params);

  const visConfig: RegionMapVisConfig = {
    ...vis.params,
    metric: schemas.metric[0],
  };

  if (schemas.segment) {
    visConfig.bucket = schemas.segment[0];
  }

  const regionmap = buildExpressionFunction<RegionMapExpressionFunctionDefinition>('regionmap', {
    visConfig: JSON.stringify(visConfig),
  });

  const ast = buildExpression([esaggs, regionmap]);

  return ast.toAst();
};
