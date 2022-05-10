/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HorizontalAlignment, Position, VerticalAlignment } from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { LEGEND_CONFIG } from '../constants';
import { LegendConfigFn } from '../types';

export const legendConfigFunction: LegendConfigFn = {
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
  async fn(input, args, handlers) {
    const { legendConfigFn } = await import('./legend_config_fn');
    return await legendConfigFn(input, args, handlers);
  },
};
