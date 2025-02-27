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

export const add: ExpressionFunctionDefinition<
  'add',
  ExpressionValueNum,
  { val: number | null | string },
  ExpressionValueNum
> = {
  name: 'add',
  help: 'This function adds a number to input',
  inputTypes: ['num'],
  args: {
    val: {
      default: 0,
      aliases: ['_'],
      help: 'Number to add to input',
      types: ['null', 'number', 'string'],
    },
  },
  fn: ({ value: value1 }, { val: input2 }) => {
    const value2 = !input2
      ? 0
      : typeof input2 === 'object'
      ? (input2 as ExpressionValueNum).value
      : Number(input2);

    return {
      type: 'num',
      value: value1 + value2,
    };
  },
};
