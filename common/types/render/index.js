import Type from '../type';

export default new Type({
  name: 'render',
  from: {
    null: () => ({
      type: 'render',
      as: 'debug',
      value: null,
    }),
  },
  to: {},
});
