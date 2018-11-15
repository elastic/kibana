/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const boolean = () => ({
  name: 'boolean',
  from: {
    null: () => false,
    number: n => Boolean(n),
    string: s => Boolean(s),
  },
  to: {
    render: value => {
      const text = `${value}`;
      return {
        type: 'render',
        as: 'text',
        value: { text },
      };
    },
    datatable: value => ({
      type: 'datatable',
      columns: [{ name: 'value', type: 'boolean' }],
      rows: [{ value }],
    }),
  },
});
