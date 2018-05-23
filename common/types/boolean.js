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
