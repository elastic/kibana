/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getVisSchemas, SchemaConfig, VisToExpressionAst } from '../../../visualizations/public';
import { buildExpression, buildExpressionFunction } from '../../../expressions/public';
import type {
  GaugeExpressionFunctionDefinition,
  GaugeShape,
} from '../../../chart_expressions/expression_gauge/common';
import { GaugeType, GaugeVisParams } from './types';
import { getStopsWithColorsFromRanges } from './utils';
import { getEsaggsFn } from './to_ast_esaggs';

const prepareDimension = (params: SchemaConfig) => {
  const visdimension = buildExpressionFunction('visdimension', { accessor: params.accessor });

  if (params.format) {
    visdimension.addArgument('format', params.format.id);
    visdimension.addArgument('formatParams', JSON.stringify(params.format.params));
  }

  return buildExpression([visdimension]);
};

const gaugeTypeToShape = (type: GaugeType): GaugeShape => {
  const arc: GaugeShape = 'arc';
  const circle: GaugeShape = 'circle';

  return {
    [GaugeType.Arc]: arc,
    [GaugeType.Circle]: circle,
  }[type];
};

export const toExpressionAst: VisToExpressionAst<GaugeVisParams> = (vis, params) => {
  const schemas = getVisSchemas(vis, params);

  const {
    gaugeType,
    percentageMode,
    percentageFormatPattern,
    colorSchema,
    colorsRange,
    invertColors,
    scale,
    style,
    labels,
  } = vis.params.gauge;

  // fix formatter for percentage mode
  if (percentageMode === true) {
    schemas.metric.forEach((metric: SchemaConfig) => {
      metric.format = {
        id: 'percent',
        params: { pattern: percentageFormatPattern },
      };
    });
  }

  const centralMajorMode = labels.show ? (style.subText ? 'custom' : 'auto') : 'none';
  const gauge = buildExpressionFunction<GaugeExpressionFunctionDefinition>('gauge', {
    shape: gaugeTypeToShape(gaugeType),
    metric: schemas.metric.map(prepareDimension),
    ticksPosition: scale.show ? 'auto' : 'hidden',
    labelMajorMode: 'none',
    colorMode: 'palette',
    centralMajorMode,
    ...(centralMajorMode === 'custom' ? { labelMinor: style.subText } : {}),
    percentageMode,
    respectRanges: true,
    commonLabel: schemas.metric?.[0]?.label,
  });

  if (colorsRange && colorsRange.length) {
    const stopsWithColors = getStopsWithColorsFromRanges(colorsRange, colorSchema, invertColors);
    const palette = buildExpressionFunction('palette', {
      ...stopsWithColors,
      range: percentageMode ? 'percent' : 'number',
      continuity: 'none',
      gradient: true,
      rangeMax: percentageMode ? 100 : stopsWithColors.stop[stopsWithColors.stop.length - 1],
      rangeMin: stopsWithColors.stop[0],
    });

    gauge.addArgument('palette', buildExpression([palette]));
  }

  const ast = buildExpression([getEsaggsFn(vis), gauge]);

  return ast.toAst();
};
