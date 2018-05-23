export const string = () => ({
  name: 'string',
  from: {
    null: () => '',
    boolean: b => String(b),
    number: n => String(n),
  },
  to: {
    render: text => {
      return {
        type: 'render',
        as: 'text',
        value: { text },
      };
    },
    datatable: value => ({
      type: 'datatable',
      columns: [{ name: 'value', type: 'string' }],
      rows: [{ value }],
    }),
  },
});
