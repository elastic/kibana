/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { findAccessorOrFail } from '../../../../visualizations/common/utils';
import type { ExpressionValueVisDimension } from '../../../../visualizations/common';
import type { DatatableColumn } from '../../../../expressions';
import { GaugeExpressionFunctionDefinition } from '../types';
import {
  EXPRESSION_GAUGE_NAME,
  GaugeCentralMajorModes,
  GaugeColorModes,
  GaugeLabelMajorModes,
  GaugeShapes,
  GaugeTicksPositions,
} from '../constants';
import { isRoundShape } from '../utils';

export const errors = {
  invalidShapeError: () =>
    i18n.translate('expressionGauge.functions.gauge.errors.invalidShapeError', {
      defaultMessage: `Invalid shape is specified. Supported shapes: {shapes}`,
      values: { shapes: Object.values(GaugeShapes).join(', ') },
    }),
  invalidColorModeError: () =>
    i18n.translate('expressionGauge.functions.gauge.errors.invalidColorModeError', {
      defaultMessage: `Invalid color mode is specified. Supported color modes: {colorModes}`,
      values: { colorModes: Object.values(GaugeColorModes).join(', ') },
    }),
  invalidTicksPositionError: () =>
    i18n.translate('expressionGauge.functions.gauge.errors.invalidTicksPositionError', {
      defaultMessage: `Invalid ticks position is specified. Supported ticks positions: {ticksPositions}`,
      values: { ticksPositions: Object.values(GaugeTicksPositions).join(', ') },
    }),
  invalidLabelMajorModeError: () =>
    i18n.translate('expressionGauge.functions.gauge.errors.invalidLabelMajorModeError', {
      defaultMessage: `Invalid label major mode is specified. Supported label major modes: {labelMajorModes}`,
      values: { labelMajorModes: Object.values(GaugeLabelMajorModes).join(', ') },
    }),
  centralMajorNotSupportedForShapeError: (shape: string) =>
    i18n.translate('expressionGauge.functions.gauge.errors.centralMajorNotSupportedForShapeError', {
      defaultMessage:
        'Fields "centralMajor" and "centralMajorMode" are not supported by the shape "{shape}"',
      values: { shape },
    }),
};

const validateAccessor = (
  accessor: string | undefined | ExpressionValueVisDimension,
  columns: DatatableColumn[]
) => {
  if (accessor && typeof accessor === 'string') {
    findAccessorOrFail(accessor, columns);
  }
};

const validateOptions = (
  value: string,
  availableOptions: Record<string, string>,
  getErrorMessage: () => string
) => {
  if (!Object.values(availableOptions).includes(value)) {
    throw new Error(getErrorMessage());
  }
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
      options: [
        GaugeShapes.HORIZONTAL_BULLET,
        GaugeShapes.VERTICAL_BULLET,
        GaugeShapes.ARC,
        GaugeShapes.CIRCLE,
      ],
      help: i18n.translate('expressionGauge.functions.gauge.args.shape.help', {
        defaultMessage: 'Type of gauge chart',
      }),
      required: true,
    },
    metric: {
      types: ['string', 'vis_dimension'],
      help: i18n.translate('expressionGauge.functions.gauge.args.metric.help', {
        defaultMessage: 'Current value',
      }),
    },
    min: {
      types: ['string', 'vis_dimension'],
      help: i18n.translate('expressionGauge.functions.gauge.args.min.help', {
        defaultMessage: 'Minimum value',
      }),
    },
    max: {
      types: ['string', 'vis_dimension'],
      help: i18n.translate('expressionGauge.functions.gauge.args.max.help', {
        defaultMessage: 'Maximum value',
      }),
    },
    goal: {
      types: ['string', 'vis_dimension'],
      help: i18n.translate('expressionGauge.functions.gauge.args.goal.help', {
        defaultMessage: 'Goal Value',
      }),
    },
    colorMode: {
      types: ['string'],
      default: GaugeColorModes.NONE,
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
      default: GaugeTicksPositions.AUTO,
      options: [GaugeTicksPositions.HIDDEN, GaugeTicksPositions.AUTO, GaugeTicksPositions.BANDS],
      help: i18n.translate('expressionGauge.functions.gauge.args.ticksPosition.help', {
        defaultMessage: 'Specifies the placement of ticks',
      }),
    },
    labelMajor: {
      types: ['string'],
      help: i18n.translate('expressionGauge.functions.gauge.args.labelMajor.help', {
        defaultMessage: 'Specifies the labelMajor of the gauge chart displayed inside the chart.',
      }),
    },
    labelMajorMode: {
      types: ['string'],
      options: [GaugeLabelMajorModes.NONE, GaugeLabelMajorModes.AUTO, GaugeLabelMajorModes.CUSTOM],
      help: i18n.translate('expressionGauge.functions.gauge.args.labelMajorMode.help', {
        defaultMessage: 'Specifies the mode of labelMajor',
      }),
      default: GaugeLabelMajorModes.AUTO,
    },
    labelMinor: {
      types: ['string'],
      help: i18n.translate('expressionGauge.functions.gauge.args.labelMinor.help', {
        defaultMessage: 'Specifies the labelMinor of the gauge chart',
      }),
    },
    centralMajor: {
      types: ['string'],
      help: i18n.translate('expressionGauge.functions.gauge.args.centralMajor.help', {
        defaultMessage: 'Specifies the centralMajor of the gauge chart displayed inside the chart.',
      }),
    },
    centralMajorMode: {
      types: ['string'],
      options: [GaugeLabelMajorModes.NONE, GaugeLabelMajorModes.AUTO, GaugeLabelMajorModes.CUSTOM],
      help: i18n.translate('expressionGauge.functions.gauge.args.centralMajorMode.help', {
        defaultMessage: 'Specifies the mode of centralMajor',
      }),
    },
    ariaLabel: {
      types: ['string'],
      help: i18n.translate('expressionGauge.functions.gaugeChart.config.ariaLabel.help', {
        defaultMessage: 'Specifies the aria label of the gauge chart',
      }),
    },
  },

  fn(data, args, handlers) {
    validateOptions(args.shape, GaugeShapes, errors.invalidShapeError);
    validateOptions(args.colorMode, GaugeColorModes, errors.invalidColorModeError);
    validateOptions(args.ticksPosition, GaugeTicksPositions, errors.invalidTicksPositionError);
    validateOptions(args.labelMajorMode, GaugeLabelMajorModes, errors.invalidLabelMajorModeError);

    validateAccessor(args.metric, data.columns);
    validateAccessor(args.min, data.columns);
    validateAccessor(args.max, data.columns);
    validateAccessor(args.goal, data.columns);

    const { centralMajor, centralMajorMode, ...restArgs } = args;

    if (!isRoundShape(args.shape) && (centralMajorMode || centralMajor)) {
      throw new Error(errors.centralMajorNotSupportedForShapeError(args.shape));
    }

    const centralMajorArgs = isRoundShape(args.shape)
      ? {
          centralMajorMode: !centralMajorMode ? GaugeCentralMajorModes.AUTO : centralMajorMode,
          centralMajor,
        }
      : {};

    return {
      type: 'render',
      as: EXPRESSION_GAUGE_NAME,
      value: {
        data,
        args: {
          ...restArgs,
          ...centralMajorArgs,
          ariaLabel:
            args.ariaLabel ??
            (handlers.variables?.embeddableTitle as string) ??
            handlers.getExecutionContext?.()?.description,
        },
      },
    };
  },
});
