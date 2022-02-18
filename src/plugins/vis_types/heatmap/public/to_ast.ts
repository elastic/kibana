/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisToExpressionAst, getVisSchemas, SchemaConfig } from '../../../visualizations/public';
import { buildExpression, buildExpressionFunction } from '../../../expressions/public';
import { getStopsWithColorsFromRanges, getStopsWithColorsFromColorsNumber } from './utils/palette';
import type { HeatmapVisParams } from './types';
import { getEsaggsFn } from './to_ast_esaggs';

const DEFAULT_PERCENT_DECIMALS = 2;

const prepareLegend = (params: HeatmapVisParams) => {
  const legend = buildExpressionFunction('heatmap_legend', {
    isVisible: params.addLegend,
    position: params.legendPosition,
    shouldTruncate: params.truncateLegend ?? true,
    maxLines: params.maxLegendLines ?? 1,
    legendSize: params.legendSize,
  });

  return buildExpression([legend]);
};

const prepareDimension = (params: SchemaConfig) => {
  const visdimension = buildExpressionFunction('visdimension', { accessor: params.accessor });

  if (params.format) {
    visdimension.addArgument('format', params.format.id);
    visdimension.addArgument('formatParams', JSON.stringify(params.format.params));
  }

  return buildExpression([visdimension]);
};

const prepareGrid = (params: HeatmapVisParams) => {
  const gridConfig = buildExpressionFunction('heatmap_grid', {
    isCellLabelVisible: params.valueAxes?.[0].labels.show ?? false,
    isXAxisLabelVisible: true,
    isYAxisTitleVisible: true,
    isXAxisTitleVisible: true,
  });

  return buildExpression([gridConfig]);
};

export const toExpressionAst: VisToExpressionAst<HeatmapVisParams> = async (vis, params) => {
  const schemas = getVisSchemas(vis, params);

  // fix formatter for percentage mode
  if (vis.params.percentageMode === true) {
    schemas.metric.forEach((metric: SchemaConfig) => {
      metric.format = {
        id: 'percent',
        params: {
          pattern:
            vis.params.percentageFormatPattern ?? `0,0.[${'0'.repeat(DEFAULT_PERCENT_DECIMALS)}]%`,
        },
      };
    });
  }

  const expressionArgs = {
    showTooltip: vis.params.addTooltip,
    highlightInHover: vis.params.enableHover,
    lastRangeIsRightOpen: vis.params.lastRangeIsRightOpen ?? false,
    percentageMode: vis.params.percentageMode,
    legend: prepareLegend(vis.params),
    gridConfig: prepareGrid(vis.params),
  };

  const visTypeHeatmap = buildExpressionFunction('heatmap', expressionArgs);
  if (schemas.metric.length) {
    visTypeHeatmap.addArgument('valueAccessor', prepareDimension(schemas.metric[0]));
  }
  if (schemas.segment && schemas.segment.length) {
    visTypeHeatmap.addArgument('xAccessor', prepareDimension(schemas.segment[0]));
  }
  if (schemas.group && schemas.group.length) {
    visTypeHeatmap.addArgument('yAccessor', prepareDimension(schemas.group[0]));
  }
  if (schemas.split_row && schemas.split_row.length) {
    visTypeHeatmap.addArgument('splitRowAccessor', prepareDimension(schemas.split_row[0]));
  }
  if (schemas.split_column && schemas.split_column.length) {
    visTypeHeatmap.addArgument('splitColumnAccessor', prepareDimension(schemas.split_column[0]));
  }
  let palette;
  if (vis.params.setColorRange && vis.params.colorsRange && vis.params.colorsRange.length) {
    const stopsWithColors = getStopsWithColorsFromRanges(
      vis.params.colorsRange,
      vis.params.colorSchema,
      vis.params.invertColors
    );
    // palette is type of number, if user gives specific ranges
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
    // palette is type of percent, if user wants dynamic calulated ranges
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
