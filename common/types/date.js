export const date = {
  name: 'date',
  from: {
    number: n => ({
      type: 'date',
      value: new Date(n),
    }),
    string: s => ({
      type: 'date',
      value: new Date(s),
    }),
  },
  to: {
    string: d => d.value.toISOString(),
    number: d => d.value.getTime(),
    render: d => {
      return {
        type: 'render',
        as: 'markdown',
        value: {
          content: String(d.value.toISOString()),
        },
      };
    },
    datatable: (d) => {
      return {
        type: 'datatable',
        columns: [
          {
            name: 'value',
            type: 'date',
          },
        ],
        rows: [{ value: d.value.getTime() }],
      };
    },
  },
};
