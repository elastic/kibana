export const number = () => ({
  name: 'number',
  from: {
    null: () => 0,
    string: n => Number(n),
  },
  to: {
    string: n => String(n),
    render: value => {
      return {
        type: 'render',
        as: 'text',
        value: `${value}`,
      };
    },
    datatable: value => {
      return {
        type: 'datatable',
        columns: [
          {
            name: 'value',
            type: 'number',
          },
        ],
        rows: [{ value }],
      };
    },
  },
});
