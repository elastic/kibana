export const style = {
  name: 'style',
  from: {
    null: () => {
      return {
        type: 'style',
        spec: {},
        css: 'TODO implement css conversion',
      };
    },
  },
  to: {
    render: (value) => ({
      type: 'render',
      as: 'debug',
      value,
    }),
  },
};
