export default {
  name: 'render',
  from: {
    null: () => ({
      type: 'render',
      as: 'debug',
      value: null,
    }),
  },
  to: {},
};
