/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ExpressionFunctionDefinition } from '../types';

export type ExpressionFunctionClog = ExpressionFunctionDefinition<'clog', unknown, {}, unknown>;

export const clog: ExpressionFunctionClog = {
  name: 'clog',
  args: {},
  help: 'Outputs the context to the console',
  fn: (input: unknown) => {
    // eslint-disable-next-line no-console
    console.log(input);
    return input;
  },
};
