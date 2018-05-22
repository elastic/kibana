export const boolean = () => ({
  name: 'boolean',
  from: {
    null: () => false,
    number: n => Boolean(n),
    string: s => Boolean(s),
  },
  to: {
    string: n => String(n),
    number: n => Number(n),
    render: value => {
      const text = `${value}`;
      return {
        type: 'render',
        as: 'text',
        value: { text },
      };
    },
  },
});
