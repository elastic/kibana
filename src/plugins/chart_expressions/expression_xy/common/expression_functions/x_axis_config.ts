/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { strings } from '../i18n';
import { XAxisConfigFn } from '../types';
import { X_AXIS_CONFIG } from '../constants';
import { commonAxisConfigArgs } from './common_axis_args';

export const xAxisConfigFunction: XAxisConfigFn = {
  name: X_AXIS_CONFIG,
  aliases: [],
  type: X_AXIS_CONFIG,
  help: strings.getXAxisConfigFnHelp(),
  inputTypes: ['null'],
  args: {
    ...commonAxisConfigArgs,
  },
  fn(input, args) {
    return {
      type: X_AXIS_CONFIG,
      ...args,
    };
  },
};
