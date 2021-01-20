/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ExpressionFunctionDefinition } from '../../expression_functions';

export const introspectContext: ExpressionFunctionDefinition<
  'introspectContext',
  any,
  { key: string },
  any
> = {
  name: 'introspectContext',
  args: {
    key: {
      help: 'Context key to introspect',
      types: ['string'],
    },
  },
  help: '',
  fn: (input, args, context) => {
    return {
      type: 'any',
      result: (context as any)[args.key],
    };
  },
};
