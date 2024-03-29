/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ExpressionTypeDefinition } from '../types';
import { Datatable } from './datatable';
import { ExpressionValueRender } from './render';

const name = 'string';

export const string: ExpressionTypeDefinition<typeof name, string> = {
  name,
  from: {
    null: () => '',
    boolean: (b: boolean) => String(b),
    number: (n: number) => String(n),
  },
  to: {
    render: <T>(text: T): ExpressionValueRender<{ text: T }> => {
      return {
        type: 'render',
        as: 'text',
        value: { text },
      };
    },
    datatable: (value: string): Datatable => ({
      type: 'datatable',
      columns: [{ id: 'value', name: 'value', meta: { type: 'string' } }],
      rows: [{ value }],
    }),
  },
};
