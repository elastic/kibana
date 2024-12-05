/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Position } from '@elastic/charts';
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
    position: {
      types: ['string'],
      options: [Position.Top, Position.Bottom],
      help: strings.getAxisPositionHelp(),
      strict: true,
    },
  },
  fn(input, args) {
    return {
      type: X_AXIS_CONFIG,
      ...args,
      position: args.position ?? Position.Bottom,
    };
  },
};
