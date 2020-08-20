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

import { get } from 'lodash';
import { getVisSchemas, SchemaConfig, Vis } from '../../visualizations/public';
import { buildExpression, buildExpressionFunction } from '../../expressions/public';
import { MetricVisExpressionFunctionDefinition } from './metric_vis_fn';
import { EsaggsExpressionFunctionDefinition } from '../../data/common/search/expressions';

const prepareDimension = (params: SchemaConfig) => {
  const visdimension = buildExpressionFunction('visdimension', { accessor: params.accessor });

  if (params.format) {
    visdimension.addArgument('format', params.format.id);
    visdimension.addArgument('formatParams', JSON.stringify(params.format.params));
  }

  return buildExpression([visdimension]);
};

export const toExpressionAst = (vis: Vis, params: any) => {
  // soon this becomes: const esaggs = vis.data.aggs!.toExpressionAst();
  const esaggs = buildExpressionFunction<EsaggsExpressionFunctionDefinition>('esaggs', {
    index: vis.data.indexPattern!.id!,
    metricsAtAllLevels: vis.isHierarchical(),
    partialRows: vis.type.requiresPartialRows || vis.params.showPartialRows || false,
    aggConfigs: JSON.stringify(vis.data.aggs!.aggs),
    includeFormatHints: false,
  });

  const schemas = getVisSchemas(vis, params);

  const {
    percentageMode,
    useRanges,
    colorSchema,
    metricColorMode,
    colorsRange,
    labels,
    invertColors,
    style,
  } = vis.params.metric;

  // fix formatter for percentage mode
  if (get(vis.params, 'metric.percentageMode') === true) {
    schemas.metric.forEach((metric: SchemaConfig) => {
      metric.format = { id: 'percent' };
    });
  }

  // @ts-expect-error
  const metricVis = buildExpressionFunction<MetricVisExpressionFunctionDefinition>('metricVis', {
    percentageMode,
    colorSchema,
    colorMode: metricColorMode,
    useRanges,
    invertColors,
    showLabels: labels && labels.show,
  });

  if (style) {
    metricVis.addArgument('bgFill', style.bgFill);
    metricVis.addArgument('font', buildExpression(`font size=${style.fontSize}`));
    metricVis.addArgument('subText', style.subText);
  }

  if (colorsRange) {
    colorsRange.forEach((range: any) => {
      metricVis.addArgument(
        'colorRange',
        buildExpression(`range from=${range.from} to=${range.to}`)
      );
    });
  }

  if (schemas.group) {
    metricVis.addArgument('bucket', prepareDimension(schemas.group[0]));
  }

  schemas.metric.forEach((metric) => {
    metricVis.addArgument('metric', prepareDimension(metric));
  });

  const ast = buildExpression([esaggs, metricVis]);

  return ast.toAst();
};
