/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExpressionFunctionDefinition } from '../../expression_functions';

export const sleep: ExpressionFunctionDefinition<'sleep', unknown, { time: number }, unknown> = {
  name: 'sleep',
  args: {
    time: {
      aliases: ['_'],
      help: 'Time in milliseconds for how long to sleep',
      types: ['number'],
    },
  },
  help: '',
  fn: async (input, args, context) => {
    await new Promise((r) => setTimeout(r, args.time));
    return input;
  },
};
