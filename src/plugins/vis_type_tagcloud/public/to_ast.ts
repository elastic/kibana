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

import { EsaggsExpressionFunctionDefinition } from '../../data/common/search/expressions';
import { buildExpression, buildExpressionFunction } from '../../expressions/public';
import { getVisSchemas, SchemaConfig, Vis, BuildPipelineParams } from '../../visualizations/public';
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

export const toExpressionAst = (vis: Vis<TagCloudVisParams>, params: BuildPipelineParams) => {
  const esaggs = buildExpressionFunction<EsaggsExpressionFunctionDefinition>('esaggs', {
    index: vis.data.indexPattern!.id!,
    metricsAtAllLevels: vis.isHierarchical(),
    partialRows: false,
    aggConfigs: JSON.stringify(vis.data.aggs!.aggs),
    includeFormatHints: false,
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
