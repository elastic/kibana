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

const name = 'boolean';

export const boolean: ExpressionTypeDefinition<'boolean', boolean> = {
  name,
  from: {
    null: () => false,
    number: (n: number) => Boolean(n),
    string: (s: string) => Boolean(s),
  },
  to: {
    render: (value: boolean): ExpressionValueRender<{ text: string }> => {
      const text = `${value}`;
      return {
        type: 'render',
        as: 'text',
        value: { text },
      };
    },
    datatable: (value: boolean): Datatable => ({
      type: 'datatable',
      columns: [{ id: 'value', name: 'value', meta: { type: name } }],
      rows: [{ value }],
    }),
  },
};
