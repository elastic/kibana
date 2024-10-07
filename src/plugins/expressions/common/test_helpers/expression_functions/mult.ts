/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExpressionFunctionDefinition } from '../../expression_functions';
import { ExpressionValueNum } from '../../expression_types';

export const mult: ExpressionFunctionDefinition<
  'mult',
  ExpressionValueNum,
  { val: number },
  ExpressionValueNum
> = {
  name: 'mult',
  help: 'This function multiplies input by a number',
  args: {
    val: {
      default: 0,
      help: 'Number to multiply input by',
      types: ['number'],
    },
  },
  fn: ({ value }, args, context) => {
    return {
      type: 'num',
      value: value * args.val,
    };
  },
};
