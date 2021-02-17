/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EsaggsExpressionFunctionDefinition,
  IndexPatternLoadExpressionFunctionDefinition,
} from '../../data/public';
import { buildExpression, buildExpressionFunction } from '../../expressions/public';
import { getVisSchemas, SchemaConfig, VisToExpressionAst } from '../../visualizations/public';
import { TagcloudExpressionFunctionDefinition } from './tag_cloud_fn';
import { TagCloudVisParams } from './types';

const prepareDimension = (params: SchemaConfig) => {
  const visdimension = buildExpressionFunction('visdimension', { accessor: params.accessor });

  if (params.format) {
    visdimension.addArgument('format', params.format.id);
    visdimension.addArgument('formatParams', JSON.stringify(params.format.params));
  }

  return buildExpression([visdimension]);
};

export const toExpressionAst: VisToExpressionAst<TagCloudVisParams> = (vis, params) => {
  const esaggs = buildExpressionFunction<EsaggsExpressionFunctionDefinition>('esaggs', {
    index: buildExpression([
      buildExpressionFunction<IndexPatternLoadExpressionFunctionDefinition>('indexPatternLoad', {
        id: vis.data.indexPattern!.id!,
      }),
    ]),
    metricsAtAllLevels: vis.isHierarchical(),
    partialRows: false,
    aggs: vis.data.aggs!.aggs.map((agg) => buildExpression(agg.toExpressionAst())),
  });

  const schemas = getVisSchemas(vis, params);
  const { scale, orientation, minFontSize, maxFontSize, showLabel } = vis.params;

  const tagcloud = buildExpressionFunction<TagcloudExpressionFunctionDefinition>('tagcloud', {
    scale,
    orientation,
    minFontSize,
    maxFontSize,
    showLabel,
    metric: prepareDimension(schemas.metric[0]),
  });

  if (schemas.segment) {
    tagcloud.addArgument('bucket', prepareDimension(schemas.segment[0]));
  }

  const ast = buildExpression([esaggs, tagcloud]);

  return ast.toAst();
};
