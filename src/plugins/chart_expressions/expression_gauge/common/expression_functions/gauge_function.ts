/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { GaugeExpressionFunctionDefinition } from '../types';
import { EXPRESSION_GAUGE_NAME } from '../constants';

export const gaugeFunction = (): GaugeExpressionFunctionDefinition => ({
  name: EXPRESSION_GAUGE_NAME,
  type: 'render',
  inputTypes: ['datatable'],
  help: i18n.translate('expressionGauge.functions.help', {
    defaultMessage: 'Gauge visualization',
  }),
  args: {
    shape: {
      types: ['string'],
      options: ['horizontalBullet', 'verticalBullet'],
      help: i18n.translate('expressionGauge.functions.shape.help', {
        defaultMessage: 'Type of gauge chart',
      }),
    },
    metricAccessor: {
      types: ['string'],
      help: i18n.translate('expressionGauge.functions.metricAccessor.help', {
        defaultMessage: 'Current value',
      }),
    },
    minAccessor: {
      types: ['string'],
      help: i18n.translate('expressionGauge.functions.minAccessor.help', {
        defaultMessage: 'Minimum value',
      }),
    },
    maxAccessor: {
      types: ['string'],
      help: i18n.translate('expressionGauge.functions.maxAccessor.help', {
        defaultMessage: 'Maximum value',
      }),
    },
    goalAccessor: {
      types: ['string'],
      help: i18n.translate('expressionGauge.functions.goalAccessor.help', {
        defaultMessage: 'Goal Value',
      }),
    },
    colorMode: {
      types: ['string'],
      default: 'none',
      options: ['none', 'palette'],
      help: i18n.translate('expressionGauge.functions.colorMode.help', {
        defaultMessage: 'If set to palette, the palette colors will be applied to the bands',
      }),
    },
    palette: {
      types: ['palette'],
      help: i18n.translate('expressionGauge.functions..metric.palette.help', {
        defaultMessage: 'Provides colors for the values',
      }),
    },
    ticksPosition: {
      types: ['string'],
      options: ['auto', 'bands'],
      help: i18n.translate('expressionGauge.functions..gaugeChart.config.ticksPosition.help', {
        defaultMessage: 'Specifies the placement of ticks',
      }),
      required: true,
    },
    labelMajor: {
      types: ['string'],
      help: i18n.translate('expressionGauge.functions..gaugeChart.config.labelMajor.help', {
        defaultMessage: 'Specifies the labelMajor of the gauge chart displayed inside the chart.',
      }),
      required: false,
    },
    labelMajorMode: {
      types: ['string'],
      options: ['none', 'auto', 'custom'],
      help: i18n.translate('expressionGauge.functions..gaugeChart.config.labelMajorMode.help', {
        defaultMessage: 'Specifies the mode of labelMajor',
      }),
      required: true,
    },
    labelMinor: {
      types: ['string'],
      help: i18n.translate('expressionGauge.functions..gaugeChart.config.labelMinor.help', {
        defaultMessage: 'Specifies the labelMinor of the gauge chart',
      }),
      required: false,
    },
  },
  fn(data, args) {
    return {
      type: 'render',
      as: EXPRESSION_GAUGE_NAME,
      value: {
        data,
        args,
      },
    };
  },
});
