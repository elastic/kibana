export const style = () => ({
  name: 'style',
  from: {
    null: () => {
      return {
        type: 'style',
        spec: {},
        css: '',
      };
    },
  },
  to: {
    render: value => ({
      type: 'render',
      as: 'debug',
      value,
    }),
  },
});
