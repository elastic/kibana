/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionFunctionDefinition } from '../../expression_functions';
import { ExpressionValueNum } from '../../expression_types';

export const sum: ExpressionFunctionDefinition<'sum', unknown[], {}, ExpressionValueNum> = {
  name: 'sum',
  help: 'This function summarizes the input',
  inputTypes: [],
  args: {},
  fn: (values) => {
    return {
      type: 'num',
      value: Array.isArray(values)
        ? values
            .map(Number)
            .filter(isFinite)
            .reduce((a, b) => a + b, 0)
        : values,
    };
  },
};
