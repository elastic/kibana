/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { get } from 'lodash';
import { getVisSchemas, SchemaConfig, Vis } from '../../visualizations/public';
import { buildExpression, buildExpressionFunction } from '../../expressions/public';
import { MetricVisExpressionFunctionDefinition } from './metric_vis_fn';
import {
  EsaggsExpressionFunctionDefinition,
  IndexPatternLoadExpressionFunctionDefinition,
} from '../../data/public';

const prepareDimension = (params: SchemaConfig) => {
  const visdimension = buildExpressionFunction('visdimension', { accessor: params.accessor });

  if (params.format) {
    visdimension.addArgument('format', params.format.id);
    visdimension.addArgument('formatParams', JSON.stringify(params.format.params));
  }

  return buildExpression([visdimension]);
};

export const toExpressionAst = (vis: Vis, params: any) => {
  const esaggs = buildExpressionFunction<EsaggsExpressionFunctionDefinition>('esaggs', {
    index: buildExpression([
      buildExpressionFunction<IndexPatternLoadExpressionFunctionDefinition>('indexPatternLoad', {
        id: vis.data.indexPattern!.id!,
      }),
    ]),
    metricsAtAllLevels: vis.isHierarchical(),
    partialRows: vis.params.showPartialRows || false,
    aggs: vis.data.aggs!.aggs.map((agg) => buildExpression(agg.toExpressionAst())),
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
