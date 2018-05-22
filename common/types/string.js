export const string = () => ({
  name: 'string',
  from: {
    null: () => '',
    number: n => String(n),
  },
  to: {
    number: n => Number(n),
    render: text => {
      return {
        type: 'render',
        as: 'text',
        value: { text },
      };
    },
  },
});
