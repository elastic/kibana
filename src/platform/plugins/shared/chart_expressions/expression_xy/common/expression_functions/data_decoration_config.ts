/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { DATA_DECORATION_CONFIG } from '../constants';
import { DataDecorationConfigFn } from '../types';
import { commonDecorationConfigArgs } from './common_y_config_args';

export const dataDecorationConfigFunction: DataDecorationConfigFn = {
  name: DATA_DECORATION_CONFIG,
  aliases: [],
  type: DATA_DECORATION_CONFIG,
  help: i18n.translate('expressionXY.dataDecorationConfig.help', {
    defaultMessage: `Configure the decoration of data`,
  }),
  inputTypes: ['null'],
  args: {
    ...commonDecorationConfigArgs,
  },
  fn(input, args) {
    return {
      type: DATA_DECORATION_CONFIG,
      ...args,
    };
  },
};
