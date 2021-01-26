/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ExpressionFunctionDefinition } from '../../expression_functions';
import { ExpressionValueNum } from '../../expression_types';

export const error: ExpressionFunctionDefinition<
  'error',
  ExpressionValueNum,
  { message: string },
  ExpressionValueNum
> = {
  name: 'error',
  help: 'This function always throws an error',
  args: {
    message: {
      default: 'Unknown',
      aliases: ['_'],
      help: 'Number to add to input',
      types: ['string'],
    },
  },
  fn: (input, args, context) => {
    throw new Error(args.message);
  },
};
