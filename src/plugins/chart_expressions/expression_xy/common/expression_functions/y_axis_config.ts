/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Y_CONFIG } from '../constants';
import { YConfigFn } from '../types';
import { strings } from '../i18n';
import { commonYConfigArgs } from './common_y_config_args';

export const yAxisConfigFunction: YConfigFn = {
  name: Y_CONFIG,
  aliases: [],
  type: Y_CONFIG,
  help: strings.getYConfigFnHelp(),
  inputTypes: ['null'],
  args: { ...commonYConfigArgs },
  fn(input, args) {
    return {
      type: Y_CONFIG,
      ...args,
    };
  },
};
