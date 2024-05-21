/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Table } from 'apache-arrow';
import { ExpressionFunctionDefinition } from '../types';

export type ExpressionFunctionArrowlog = ExpressionFunctionDefinition<
  'arrowlog',
  { type: 'arrow'; table: Table },
  {},
  unknown
>;

export const arrowlog: ExpressionFunctionArrowlog = {
  name: 'arrowlog',
  args: {},
  inputTypes: ['arrow'],
  help: 'Outputs the first row of arrow table to the console. This function is for debug purposes',
  fn: (input: { type: 'arrow'; table: Table }) => {
    // eslint-disable-next-line no-console
    console.log(input.table.get(0)!.toJSON());
    return input;
  },
};
