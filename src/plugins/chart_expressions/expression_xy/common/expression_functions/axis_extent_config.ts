/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { AxisExtentConfig, AxisExtentConfigResult } from '../types';
import { AxisExtentModes, AXIS_EXTENT_CONFIG } from '../constants';

export const axisExtentConfigFunction: ExpressionFunctionDefinition<
  typeof AXIS_EXTENT_CONFIG,
  null,
  AxisExtentConfig,
  AxisExtentConfigResult
> = {
  name: AXIS_EXTENT_CONFIG,
  aliases: [],
  type: AXIS_EXTENT_CONFIG,
  help: i18n.translate('expressionXY.axisExtentConfig.help', {
    defaultMessage: `Configure the xy chart's axis extents`,
  }),
  inputTypes: ['null'],
  args: {
    mode: {
      types: ['string'],
      options: [...Object.values(AxisExtentModes)],
      help: i18n.translate('expressionXY.axisExtentConfig.extentMode.help', {
        defaultMessage: 'The extent mode',
      }),
    },
    lowerBound: {
      types: ['number'],
      help: i18n.translate('expressionXY.axisExtentConfig.lowerBound.help', {
        defaultMessage: 'Lower bound',
      }),
    },
    upperBound: {
      types: ['number'],
      help: i18n.translate('expressionXY.axisExtentConfig.upperBound.help', {
        defaultMessage: 'Upper bound',
      }),
    },
  },
  fn(input, args) {
    return {
      type: AXIS_EXTENT_CONFIG,
      ...args,
    };
  },
};
