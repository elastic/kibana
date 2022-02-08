/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { GaugeExpressionFunctionDefinition } from '../types';
import {
  EXPRESSION_GAUGE_NAME,
  GaugeColorModes,
  GaugeLabelMajorModes,
  GaugeShapes,
  GaugeTicksPositions,
} from '../constants';

export const errors = {
  invalidShapeError: () =>
    i18n.translate('expressionGauge.functions.gauge.errors.shapeIsNotSupported', {
      defaultMessage: `Invalid shape is specified. Supported shapes: {shapes}`,
      values: { shapes: Object.values(GaugeShapes).join(', ') },
    }),
};

export const gaugeFunction = (): GaugeExpressionFunctionDefinition => ({
  name: EXPRESSION_GAUGE_NAME,
  type: 'render',
  inputTypes: ['datatable'],
  help: i18n.translate('expressionGauge.functions.gauge.help', {
    defaultMessage: 'Gauge visualization',
  }),
  args: {
    shape: {
      types: ['string'],
      options: [GaugeShapes.HORIZONTAL_BULLET, GaugeShapes.VERTICAL_BULLET],
      help: i18n.translate('expressionGauge.functions.gauge.args.shape.help', {
        defaultMessage: 'Type of gauge chart',
      }),
      required: true,
      default: GaugeShapes.HORIZONTAL_BULLET,
    },
    metricAccessor: {
      types: ['string'],
      help: i18n.translate('expressionGauge.functions.gauge.args.metricAccessor.help', {
        defaultMessage: 'Current value',
      }),
    },
    minAccessor: {
      types: ['string'],
      help: i18n.translate('expressionGauge.functions.gauge.args.minAccessor.help', {
        defaultMessage: 'Minimum value',
      }),
    },
    maxAccessor: {
      types: ['string'],
      help: i18n.translate('expressionGauge.functions.gauge.args.maxAccessor.help', {
        defaultMessage: 'Maximum value',
      }),
    },
    goalAccessor: {
      types: ['string'],
      help: i18n.translate('expressionGauge.functions.gauge.args.goalAccessor.help', {
        defaultMessage: 'Goal Value',
      }),
    },
    colorMode: {
      types: ['string'],
      default: 'none',
      options: [GaugeColorModes.NONE, GaugeColorModes.PALETTE],
      help: i18n.translate('expressionGauge.functions.gauge.args.colorMode.help', {
        defaultMessage: 'If set to palette, the palette colors will be applied to the bands',
      }),
    },
    palette: {
      types: ['palette'],
      help: i18n.translate('expressionGauge.functions.gauge.args.palette.help', {
        defaultMessage: 'Provides colors for the values',
      }),
    },
    ticksPosition: {
      types: ['string'],
      options: [GaugeTicksPositions.AUTO, GaugeTicksPositions.BANDS],
      help: i18n.translate('expressionGauge.functions.gauge.args.ticksPosition.help', {
        defaultMessage: 'Specifies the placement of ticks',
      }),
      required: true,
    },
    labelMajor: {
      types: ['string'],
      help: i18n.translate('expressionGauge.functions.gauge.args.labelMajor.help', {
        defaultMessage: 'Specifies the labelMajor of the gauge chart displayed inside the chart.',
      }),
      required: false,
    },
    labelMajorMode: {
      types: ['string'],
      options: [GaugeLabelMajorModes.NONE, GaugeLabelMajorModes.AUTO, GaugeLabelMajorModes.CUSTOM],
      help: i18n.translate('expressionGauge.functions.gauge.args.labelMajorMode.help', {
        defaultMessage: 'Specifies the mode of labelMajor',
      }),
      required: true,
    },
    labelMinor: {
      types: ['string'],
      help: i18n.translate('expressionGauge.functions.gauge.args.labelMinor.help', {
        defaultMessage: 'Specifies the labelMinor of the gauge chart',
      }),
      required: false,
    },
    ariaLabel: {
      types: ['string'],
      help: i18n.translate('expressionGauge.functions.gaugeChart.config.ariaLabel.help', {
        defaultMessage: 'Specifies the aria label of the gauge chart',
      }),
      required: false,
    },
  },

  fn(data, args, handlers) {
    if (!Object.values(GaugeShapes).includes(args.shape)) {
      throw new Error(strings.invalidShapeError());
    }

    return {
      type: 'render',
      as: EXPRESSION_GAUGE_NAME,
      value: {
        data,
        args: {
          ...args,
          ariaLabel:
            args.ariaLabel ??
            (handlers.variables?.embeddableTitle as string) ??
            handlers.getExecutionContext?.()?.description,
        },
      },
    };
  },
});
