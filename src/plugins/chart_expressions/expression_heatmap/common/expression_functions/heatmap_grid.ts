/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '../../../../expressions/common';
import { EXPRESSION_HEATMAP_GRID_NAME } from '../constants';
import { HeatmapGridConfig, HeatmapGridConfigResult } from '../types';

export const heatmapGridConfig: ExpressionFunctionDefinition<
  typeof EXPRESSION_HEATMAP_GRID_NAME,
  null,
  HeatmapGridConfig,
  HeatmapGridConfigResult
> = {
  name: EXPRESSION_HEATMAP_GRID_NAME,
  aliases: [],
  type: EXPRESSION_HEATMAP_GRID_NAME,
  help: `Configure the heatmap layout `,
  inputTypes: ['null'],
  args: {
    // grid
    strokeWidth: {
      types: ['number'],
      help: i18n.translate('expressionHeatmap.function.args.grid.strokeWidth.help', {
        defaultMessage: 'Specifies the grid stroke width',
      }),
      required: false,
    },
    strokeColor: {
      types: ['string'],
      help: i18n.translate('expressionHeatmap.function.args.grid.strokeColor.help', {
        defaultMessage: 'Specifies the grid stroke color',
      }),
      required: false,
    },
    cellHeight: {
      types: ['number'],
      help: i18n.translate('expressionHeatmap.function.args.grid.cellHeight.help', {
        defaultMessage: 'Specifies the grid cell height',
      }),
      required: false,
    },
    cellWidth: {
      types: ['number'],
      help: i18n.translate('expressionHeatmap.function.args.grid.cellWidth.help', {
        defaultMessage: 'Specifies the grid cell width',
      }),
      required: false,
    },
    // cells
    isCellLabelVisible: {
      types: ['boolean'],
      help: i18n.translate('expressionHeatmap.function.args.grid.isCellLabelVisible.help', {
        defaultMessage: 'Specifies whether or not the cell label is visible.',
      }),
    },
    // Y-axis
    isYAxisLabelVisible: {
      types: ['boolean'],
      help: i18n.translate('expressionHeatmap.function.args.grid.isYAxisLabelVisible.help', {
        defaultMessage: 'Specifies whether or not the Y-axis labels are visible.',
      }),
    },
    yAxisLabelWidth: {
      types: ['number'],
      help: i18n.translate('expressionHeatmap.function.args.grid.yAxisLabelWidth.help', {
        defaultMessage: 'Specifies the width of the Y-axis labels.',
      }),
      required: false,
    },
    yAxisLabelColor: {
      types: ['string'],
      help: i18n.translate('expressionHeatmap.function.args.grid.yAxisLabelColor.help', {
        defaultMessage: 'Specifies the color of the Y-axis labels.',
      }),
      required: false,
    },
    // X-axis
    isXAxisLabelVisible: {
      types: ['boolean'],
      help: i18n.translate('expressionHeatmap.function.args.grid.isXAxisLabelVisible.help', {
        defaultMessage: 'Specifies whether or not the X-axis labels are visible.',
      }),
    },
  },
  fn(input, args) {
    return {
      type: EXPRESSION_HEATMAP_GRID_NAME,
      ...args,
    };
  },
};
