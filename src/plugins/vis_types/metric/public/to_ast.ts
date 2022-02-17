/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { getVisSchemas, SchemaConfig, VisToExpressionAst } from '../../../visualizations/public';
import { buildExpression, buildExpressionFunction } from '../../../expressions/public';
import { inter } from '../../../expressions/common';

import {
  EsaggsExpressionFunctionDefinition,
  IndexPatternLoadExpressionFunctionDefinition,
} from '../../../data/public';
import { VisParams } from './types';
import { getStopsWithColorsFromRanges } from './utils';

const prepareDimension = (params: SchemaConfig) => {
  const visdimension = buildExpressionFunction('visdimension', { accessor: params.accessor });

  if (params.format) {
    visdimension.addArgument('format', params.format.id);
    visdimension.addArgument('formatParams', JSON.stringify(params.format.params));
  }

  return buildExpression([visdimension]);
};

export const toExpressionAst: VisToExpressionAst<VisParams> = (vis, params) => {
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

  const {
    percentageMode,
    percentageFormatPattern,
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
      metric.format = {
        id: 'percent',
        params: { pattern: percentageFormatPattern },
      };
    });
  }

  const metricVis = buildExpressionFunction('metricVis', {
    percentageMode,
    colorMode: metricColorMode,
    showLabels: labels?.show ?? false,
  });

  // Pt unit is provided to support the previous view of the metricVis at vis_types editor.
  // Inter font is defined here to override the default `openSans` font, which comes from the expession.
  metricVis.addArgument(
    'font',
    buildExpression(
      `font family="${inter.value}" 
        weight="bold"
        align="center"
        sizeUnit="pt"
        ${style ? `size=${style.fontSize}` : ''}`
    )
  );

  if (colorsRange && colorsRange.length) {
    const stopsWithColors = getStopsWithColorsFromRanges(colorsRange, colorSchema, invertColors);
    const palette = buildExpressionFunction('palette', {
      ...stopsWithColors,
      range: 'number',
      continuity: 'none',
    });

    metricVis.addArgument('palette', buildExpression([palette]));
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
