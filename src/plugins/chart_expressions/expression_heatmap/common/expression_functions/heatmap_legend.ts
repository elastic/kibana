/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { Position } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '../../../../expressions/common';
import { validateOptions } from '../../../../charts/common';
import { EXPRESSION_HEATMAP_LEGEND_NAME } from '../constants';
import { HeatmapLegendConfig, HeatmapLegendConfigResult } from '../types';

export const errors = {
  invalidPositionError: () =>
    i18n.translate('expressionHeatmap.functions.heatmap.errors.invalidPositionError', {
      defaultMessage: `Invalid position is specified. Supported positions: {positions}`,
      values: { positions: Object.values(Position).join(', ') },
    }),
};

export const heatmapLegendConfig: ExpressionFunctionDefinition<
  typeof EXPRESSION_HEATMAP_LEGEND_NAME,
  null,
  HeatmapLegendConfig,
  HeatmapLegendConfigResult
> = {
  name: EXPRESSION_HEATMAP_LEGEND_NAME,
  aliases: [],
  type: EXPRESSION_HEATMAP_LEGEND_NAME,
  help: `Configure the heatmap chart's legend`,
  inputTypes: ['null'],
  args: {
    isVisible: {
      types: ['boolean'],
      help: i18n.translate('expressionHeatmap.function.args.legend.isVisible.help', {
        defaultMessage: 'Specifies whether or not the legend is visible.',
      }),
    },
    position: {
      types: ['string'],
      default: Position.Right,
      options: [Position.Top, Position.Right, Position.Bottom, Position.Left],
      help: i18n.translate('expressionHeatmap.function.args.legend.position.help', {
        defaultMessage: 'Specifies the legend position.',
      }),
    },
    maxLines: {
      types: ['number'],
      help: i18n.translate('expressionHeatmap.function.args.legend.maxLines.help', {
        defaultMessage: 'Specifies the number of lines per legend item.',
      }),
    },
    shouldTruncate: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('expressionHeatmap.function.args.legend.shouldTruncate.help', {
        defaultMessage: 'Specifies whether or not the legend items should be truncated.',
      }),
    },
  },
  fn(input, args) {
    validateOptions(args.position, Position, errors.invalidPositionError);
    return {
      type: EXPRESSION_HEATMAP_LEGEND_NAME,
      ...args,
    };
  },
};
