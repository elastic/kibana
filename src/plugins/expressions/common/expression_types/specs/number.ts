/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionTypeDefinition } from '../types';
import { Datatable } from './datatable';
import { ExpressionValueRender } from './render';

const name = 'number';

export const number: ExpressionTypeDefinition<typeof name, number> = {
  name,
  from: {
    null: () => 0,
    boolean: (b) => Number(b),
    string: (n) => {
      const value = Number(n);
      if (Number.isNaN(value)) {
        throw new Error(
          i18n.translate('expressions.types.number.fromStringConversionErrorMessage', {
            defaultMessage: 'Can\'t typecast "{string}" string to number',
            values: {
              string: n,
            },
          })
        );
      }
      return value;
    },
  },
  to: {
    render: (value: number): ExpressionValueRender<{ text: string }> => {
      const text = `${value}`;
      return {
        type: 'render',
        as: 'text',
        value: { text },
      };
    },
    datatable: (value): Datatable => ({
      type: 'datatable',
      columns: [{ id: 'value', name: 'value', meta: { type: 'number' } }],
      rows: [{ value }],
    }),
  },
};
