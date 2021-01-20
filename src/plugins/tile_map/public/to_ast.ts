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
import { TileMapExpressionFunctionDefinition } from './tile_map_fn';
import { TileMapVisConfig, TileMapVisParams } from './types';

export const toExpressionAst = (vis: Vis<TileMapVisParams>, params: BuildPipelineParams) => {
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

  const visConfig: TileMapVisConfig = {
    ...vis.params,
    dimensions: {
      metric: schemas.metric[0],
      geohash: schemas.segment ? schemas.segment[0] : null,
      geocentroid: schemas.geo_centroid ? schemas.geo_centroid[0] : null,
    },
  };

  const tilemap = buildExpressionFunction<TileMapExpressionFunctionDefinition>('tilemap', {
    visConfig: JSON.stringify(visConfig),
  });

  const ast = buildExpression([esaggs, tilemap]);

  return ast.toAst();
};
