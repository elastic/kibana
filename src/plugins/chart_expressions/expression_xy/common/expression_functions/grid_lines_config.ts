/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { GRID_LINES_CONFIG } from '../constants';
import { AxesSettingsConfig, GridlinesConfigResult } from '../types';

export const gridlinesConfigFunction: ExpressionFunctionDefinition<
  typeof GRID_LINES_CONFIG,
  null,
  AxesSettingsConfig,
  GridlinesConfigResult
> = {
  name: GRID_LINES_CONFIG,
  aliases: [],
  type: GRID_LINES_CONFIG,
  help: i18n.translate('expressionXY.gridlinesConfig.help', {
    defaultMessage: `Configure the xy chart's gridlines appearance`,
  }),
  inputTypes: ['null'],
  args: {
    x: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.gridlinesConfig.x.help', {
        defaultMessage: 'Specifies whether or not the gridlines of the x-axis are visible.',
      }),
    },
    yLeft: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.gridlinesConfig.yLeft.help', {
        defaultMessage: 'Specifies whether or not the gridlines of the left y-axis are visible.',
      }),
    },
    yRight: {
      types: ['boolean'],
      help: i18n.translate('expressionXY.gridlinesConfig.yRight.help', {
        defaultMessage: 'Specifies whether or not the gridlines of the right y-axis are visible.',
      }),
    },
  },
  fn(input, args) {
    return {
      type: GRID_LINES_CONFIG,
      ...args,
    };
  },
};
