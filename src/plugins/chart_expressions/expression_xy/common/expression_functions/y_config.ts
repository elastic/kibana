/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import { Y_CONFIG } from '../constants';
import { YConfig, YConfigResult } from '../types';
import { commonYConfigArgs } from './common_y_config_args';

export const yConfigFunction: ExpressionFunctionDefinition<
  typeof Y_CONFIG,
  null,
  YConfig,
  YConfigResult
> = {
  name: Y_CONFIG,
  aliases: [],
  type: Y_CONFIG,
  help: i18n.translate('expressionXY.yConfig.help', {
    defaultMessage: `Configure the behavior of a xy chart's y axis metric`,
  }),
  inputTypes: ['null'],
  args: {
    ...commonYConfigArgs,
  },
  fn(input, args) {
    return {
      type: Y_CONFIG,
      ...args,
    };
  },
};
