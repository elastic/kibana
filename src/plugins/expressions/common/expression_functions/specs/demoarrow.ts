/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Table, tableFromArrays } from 'apache-arrow';
import { ExpressionFunctionDefinition } from '../types';

export type ExpressionFunctionArrowlog = ExpressionFunctionDefinition<
  'demoarrow',
  unknown,
  {},
  { type: 'arrow'; table: Table }
>;

export const demoarrow: ExpressionFunctionArrowlog = {
  name: 'demoarrow',
  args: {},
  type: 'arrow',
  help: 'generates sample arrow table',
  fn: () => {
    // const table = tableFromJSON([{ test: 'hello', test2: 'world', test3: 4 }]);
    const table = tableFromArrays({ test: ['hello'], test2: ['world'], test3: [4] });
    return { type: 'arrow', table };
  },
};
