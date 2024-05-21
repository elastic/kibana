/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Table } from 'apache-arrow';

import { ExpressionTypeDefinition } from '../types';

const name = 'arrow';

export const arrow: ExpressionTypeDefinition<
  typeof name,
  { type: 'arrow'; table: Table },
  { type: 'arrow'; table: Table }
> = {
  name,
  validate: (table: Record<string, unknown>) => {
    // TODO: Check columns types. Only string, boolean, number, date, allowed for now.
    if (!table.columns) {
      throw new Error('datatable must have a columns array, even if it is empty');
    }

    if (!table.rows) {
      throw new Error('datatable must have a rows array, even if it is empty');
    }
  },
  serialize: (table) => {
    return table;
  },
  deserialize: (table) => {
    return table;
  },
  from: {},
  to: {},
};
