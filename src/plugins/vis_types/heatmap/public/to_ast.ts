/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisToExpressionAst, getVisSchemas } from '../../../visualizations/public';
import { buildExpression, buildExpressionFunction } from '../../../expressions/public';
import { getStopsWithColorsFromRanges, getStopsWithColorsFromColorsNumber } from './utils/palette';
import type { HeatmapVisParams } from './types';
import { getEsaggsFn } from './to_ast_esaggs';

const DEFAULT_PERCENT_DECIMALS = 2;

const prepareLegend = (params: HeatmapVisParams) => {
  const legend = buildExpressionFunction('heatmap_legend', {
    isVisible: params.addLegend,
    position: params.legendPosition,
  });

  return buildExpression([legend]);
};

const prepareGrid = (params: HeatmapVisParams) => {
  const gridConfig = buildExpressionFunction('heatmap_grid', {
    isCellLabelVisible: params.isCellLabelVisible,
    isXAxisLabelVisible: true,
  });

  return buildExpression([gridConfig]);
};

export const toExpressionAst: VisToExpressionAst<HeatmapVisParams> = async (vis, params) => {
  const schemas = getVisSchemas(vis, params);

  const expressionArgs = {
    showTooltip: vis.params.addTooltip,
    highlightInHover: vis.params.enableHover,
    useDistinctBands: vis.params.useDistinctBands ?? true,
    percentageMode: vis.params.percentageMode,
    xAccessor: schemas.segment?.[0].accessor,
    yAccessor: schemas.group?.[0].accessor,
    valueAccessor: schemas.metric[0].accessor,
    splitRowAccessor: schemas.split_row?.[0].accessor,
    splitColumnAccessor: schemas.split_column?.[0].accessor,
    percentageFormatPattern:
      vis.params.percentageFormatPattern ?? `0,0.[${'0'.repeat(DEFAULT_PERCENT_DECIMALS)}]%`,
    legend: prepareLegend(vis.params),
    gridConfig: prepareGrid(vis.params),
  };

  const visTypeHeatmap = buildExpressionFunction('heatmap', expressionArgs);
  let palette;
  if (vis.params.setColorRange && vis.params.colorsRange && vis.params.colorsRange.length) {
    const stopsWithColors = getStopsWithColorsFromRanges(
      vis.params.colorsRange,
      vis.params.colorSchema,
      vis.params.invertColors
    );
    palette = buildExpressionFunction('palette', {
      ...stopsWithColors,
      range: 'number',
      continuity: 'none',
      rangeMin:
        vis.params.setColorRange && vis.params.colorsRange && vis.params.colorsRange.length
          ? vis.params.colorsRange[0].from
          : undefined,
      rangeMax:
        vis.params.setColorRange && vis.params.colorsRange && vis.params.colorsRange.length
          ? vis.params.colorsRange[vis.params?.colorsRange.length - 1].to
          : undefined,
    });
  } else {
    const stopsWithColors = getStopsWithColorsFromColorsNumber(
      vis.params.colorsNumber,
      vis.params.colorSchema,
      vis.params.invertColors
    );
    palette = buildExpressionFunction('palette', {
      ...stopsWithColors,
      range: 'percent',
      continuity: 'none',
      rangeMin: 0,
      rangeMax: 100,
    });
  }
  visTypeHeatmap.addArgument('palette', buildExpression([palette]));

  const ast = buildExpression([getEsaggsFn(vis), visTypeHeatmap]);

  return ast.toAst();
};
