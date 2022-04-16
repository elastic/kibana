/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type {
  ExpressionFunctionDefinition,
  Datatable,
  ExpressionValueBoxed,
} from '@kbn/expressions-plugin/public';
import type { ThresholdLine } from '../types';

export type ExpressionValueThresholdLine = ExpressionValueBoxed<
  'threshold_line',
  {
    show: ThresholdLine['show'];
    value: ThresholdLine['value'];
    width: ThresholdLine['width'];
    style: ThresholdLine['style'];
    color: ThresholdLine['color'];
  }
>;

export const thresholdLine = (): ExpressionFunctionDefinition<
  'thresholdline',
  Datatable | null,
  ThresholdLine,
  ExpressionValueThresholdLine
> => ({
  name: 'thresholdline',
  help: i18n.translate('visTypeXy.function.thresholdLine.help', {
    defaultMessage: 'Generates threshold line object',
  }),
  type: 'threshold_line',
  args: {
    show: {
      types: ['boolean'],
      help: i18n.translate('visTypeXy.function.thresholdLine.show.help', {
        defaultMessage: 'Show threshould line',
      }),
      required: true,
    },
    value: {
      types: ['number', 'null'],
      help: i18n.translate('visTypeXy.function.thresholdLine.value.help', {
        defaultMessage: 'Threshold value',
      }),
      required: true,
    },
    width: {
      types: ['number', 'null'],
      help: i18n.translate('visTypeXy.function.thresholdLine.width.help', {
        defaultMessage: 'Width of threshold line',
      }),
      required: true,
    },
    style: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.thresholdLine.style.help', {
        defaultMessage: 'Style of threshold line. Can be full, dashed or dot-dashed',
      }),
      required: true,
    },
    color: {
      types: ['string'],
      help: i18n.translate('visTypeXy.function.thresholdLine.color.help', {
        defaultMessage: 'Color of threshold line',
      }),
      required: true,
    },
  },
  fn: (context, args) => {
    return {
      type: 'threshold_line',
      show: args.show,
      value: args.value,
      width: args.width,
      style: args.style,
      color: args.color,
    };
  },
});
