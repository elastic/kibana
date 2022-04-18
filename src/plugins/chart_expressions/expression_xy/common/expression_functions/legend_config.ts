/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HorizontalAlignment, Position, VerticalAlignment } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { LEGEND_CONFIG } from '../constants';
import { LegendConfig, LegendConfigResult } from '../types';

const errors = {
  positionUsageWithIsInsideError: () =>
    i18n.translate(
      'expressionXY.reusable.function.legendConfig.errors.positionUsageWithIsInsideError',
      {
        defaultMessage:
          '`position` argument is not applied if `isInside = true`. Please, use `horizontalAlignment` and `verticalAlignment` arguments instead.',
      }
    ),
  alignmentUsageWithFalsyIsInsideError: () =>
    i18n.translate(
      'expressionXY.reusable.function.legendConfig.errors.alignmentUsageWithFalsyIsInsideError',
      {
        defaultMessage:
          '`horizontalAlignment` and `verticalAlignment` arguments are not applied if `isInside = false`. Please, use the `position` argument instead.',
      }
    ),
  floatingColumnsWithFalsyIsInsideError: () =>
    i18n.translate(
      'expressionXY.reusable.function.legendConfig.errors.floatingColumnsWithFalsyIsInsideError',
      {
        defaultMessage: '`floatingColumns` arguments are not applied if `isInside = false`.',
      }
    ),
  legendSizeWithFalsyIsInsideError: () =>
    i18n.translate(
      'expressionXY.reusable.function.legendConfig.errors.legendSizeWithFalsyIsInsideError',
      {
        defaultMessage: '`legendSize` argument is not applied if `isInside = false`.',
      }
    ),
};

export const legendConfigFunction: ExpressionFunctionDefinition<
  typeof LEGEND_CONFIG,
  null,
  LegendConfig,
  LegendConfigResult
> = {
  name: LEGEND_CONFIG,
  aliases: [],
  type: LEGEND_CONFIG,
  help: i18n.translate('expressionXY.legendConfig.help', {
    defaultMessage: `Configure the xy chart's legend`,
  }),
  inputTypes: ['null'],
  args: {
    isVisible: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.legendConfig.isVisible.help', {
        defaultMessage: 'Specifies whether or not the legend is visible.',
      }),
      default: true,
    },
    position: {
      types: ['string'],
      options: [Position.Top, Position.Right, Position.Bottom, Position.Left],
      help: i18n.translate('expressionXY.legendConfig.position.help', {
        defaultMessage: 'Specifies the legend position.',
      }),
      strict: true,
    },
    showSingleSeries: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.legendConfig.showSingleSeries.help', {
        defaultMessage: 'Specifies whether a legend with just a single entry should be shown',
      }),
    },
    isInside: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.legendConfig.isInside.help', {
        defaultMessage: 'Specifies whether a legend is inside the chart',
      }),
    },
    horizontalAlignment: {
      types: ['string'],
      options: [HorizontalAlignment.Right, HorizontalAlignment.Left],
      help: i18n.translate('expressionXY.legendConfig.horizontalAlignment.help', {
        defaultMessage:
          'Specifies the horizontal alignment of the legend when it is displayed inside chart.',
      }),
      strict: true,
    },
    verticalAlignment: {
      types: ['string'],
      options: [VerticalAlignment.Top, VerticalAlignment.Bottom],
      help: i18n.translate('expressionXY.legendConfig.verticalAlignment.help', {
        defaultMessage:
          'Specifies the vertical alignment of the legend when it is displayed inside chart.',
      }),
      strict: true,
    },
    floatingColumns: {
      types: ['number'],
      help: i18n.translate('expressionXY.legendConfig.floatingColumns.help', {
        defaultMessage: 'Specifies the number of columns when legend is displayed inside chart.',
      }),
    },
    maxLines: {
      types: ['number'],
      help: i18n.translate('expressionXY.legendConfig.maxLines.help', {
        defaultMessage: 'Specifies the number of lines per legend item.',
      }),
    },
    shouldTruncate: {
      types: ['boolean'],
      default: true,
      help: i18n.translate('expressionXY.legendConfig.shouldTruncate.help', {
        defaultMessage: 'Specifies whether the legend items will be truncated or not',
      }),
    },
    legendSize: {
      types: ['number'],
      help: i18n.translate('expressionXY.legendConfig.legendSize.help', {
        defaultMessage: 'Specifies the legend size in pixels.',
      }),
    },
  },
  fn(input, args) {
    if (args.isInside) {
      if (args.position) {
        throw new Error(errors.positionUsageWithIsInsideError());
      }

      if (args.legendSize !== undefined) {
        throw new Error(errors.legendSizeWithFalsyIsInsideError());
      }
    }

    if (!args.isInside) {
      if (args.verticalAlignment || args.horizontalAlignment) {
        throw new Error(errors.alignmentUsageWithFalsyIsInsideError());
      }

      if (args.floatingColumns !== undefined) {
        throw new Error(errors.floatingColumnsWithFalsyIsInsideError());
      }
    }

    return {
      type: LEGEND_CONFIG,
      ...args,
    };
  },
};
