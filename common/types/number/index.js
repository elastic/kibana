import Type from '../type';

export default new Type({
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
        value: String(input),
      };
    },
  },
});
