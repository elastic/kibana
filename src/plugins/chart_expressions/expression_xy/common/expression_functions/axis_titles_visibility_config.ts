/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '../../../../expressions/common';
import { AXIS_TITLES_VISIBILITY_CONFIG } from '../constants';
import { AxesSettingsConfig, AxisTitlesVisibilityConfigResult } from '../types';

export const axisTitlesVisibilityConfigFunction: ExpressionFunctionDefinition<
  typeof AXIS_TITLES_VISIBILITY_CONFIG,
  null,
  AxesSettingsConfig,
  AxisTitlesVisibilityConfigResult
> = {
  name: AXIS_TITLES_VISIBILITY_CONFIG,
  aliases: [],
  type: AXIS_TITLES_VISIBILITY_CONFIG,
  help: i18n.translate('expressionXY.axisTitlesVisibilityConfig.help', {
    defaultMessage: `Configure the xy chart's axis titles appearance`,
  }),
  inputTypes: ['null'],
  args: {
    x: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.axisTitlesVisibilityConfig.x.help', {
        defaultMessage: 'Specifies whether or not the title of the x-axis are visible.',
      }),
    },
    yLeft: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.axisTitlesVisibilityConfig.yLeft.help', {
        defaultMessage: 'Specifies whether or not the title of the left y-axis are visible.',
      }),
    },
    yRight: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.axisTitlesVisibilityConfig.yRight.help', {
        defaultMessage: 'Specifies whether or not the title of the right y-axis are visible.',
      }),
    },
  },
  fn(inputn, args) {
    return {
      type: AXIS_TITLES_VISIBILITY_CONFIG,
      ...args,
    };
  },
};
