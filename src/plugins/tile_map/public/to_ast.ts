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
