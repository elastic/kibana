/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common';
import { LABELS_ORIENTATION_CONFIG } from '../constants';
import { LabelsOrientationConfig, LabelsOrientationConfigResult } from '../types';

export const labelsOrientationConfigFunction: ExpressionFunctionDefinition<
  typeof LABELS_ORIENTATION_CONFIG,
  null,
  LabelsOrientationConfig,
  LabelsOrientationConfigResult
> = {
  name: LABELS_ORIENTATION_CONFIG,
  aliases: [],
  type: LABELS_ORIENTATION_CONFIG,
  help: i18n.translate('expressionXY.labelsOrientationConfig.help', {
    defaultMessage: `Configure the xy chart's tick labels orientation`,
  }),
  inputTypes: ['null'],
  args: {
    x: {
      types: ['number'],
      options: [0, -90, -45],
      help: i18n.translate('expressionXY.labelsOrientationConfig.x.help', {
        defaultMessage: 'Specifies the labels orientation of the x-axis.',
      }),
    },
    yLeft: {
      types: ['number'],
      options: [0, -90, -45],
      help: i18n.translate('expressionXY.labelsOrientationConfig.yLeft.help', {
        defaultMessage: 'Specifies the labels orientation of the left y-axis.',
      }),
    },
    yRight: {
      types: ['number'],
      options: [0, -90, -45],
      help: i18n.translate('expressionXY.labelsOrientationConfig.yRight.help', {
        defaultMessage: 'Specifies the labels orientation of the right y-axis.',
      }),
    },
  },
  fn(input, args) {
    return {
      type: LABELS_ORIENTATION_CONFIG,
      ...args,
    };
  },
};
