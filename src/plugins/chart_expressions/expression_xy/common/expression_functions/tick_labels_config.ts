/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { TICK_LABELS_CONFIG } from '../constants';
import { AxesSettingsConfig, TickLabelsConfigResult } from '../types';

export const tickLabelsConfigFunction: ExpressionFunctionDefinition<
  typeof TICK_LABELS_CONFIG,
  null,
  AxesSettingsConfig,
  TickLabelsConfigResult
> = {
  name: TICK_LABELS_CONFIG,
  aliases: [],
  type: TICK_LABELS_CONFIG,
  help: i18n.translate('expressionXY.tickLabelsConfig.help', {
    defaultMessage: `Configure the xy chart's tick labels appearance`,
  }),
  inputTypes: ['null'],
  args: {
    x: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.tickLabelsConfig.x.help', {
        defaultMessage: 'Specifies whether or not the tick labels of the x-axis are visible.',
      }),
    },
    yLeft: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.tickLabelsConfig.yLeft.help', {
        defaultMessage: 'Specifies whether or not the tick labels of the left y-axis are visible.',
      }),
    },
    yRight: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.tickLabelsConfig.yRight.help', {
        defaultMessage: 'Specifies whether or not the tick labels of the right y-axis are visible.',
      }),
    },
  },
  fn(input, args) {
    return {
      type: TICK_LABELS_CONFIG,
      ...args,
    };
  },
};
