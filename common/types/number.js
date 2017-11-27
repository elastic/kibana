export const number = {
  name: 'number',
  from: {
    null: () => 0,
    string: (n) => Number(n),
  },
  to: {
    string: (n) => String(n),
    render: (input) => {
      return {
        type: 'render',
        as: 'markdown',
        value: {
          content: String(input),
        },
      };
    },
    datatable: (value) => {
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
};
