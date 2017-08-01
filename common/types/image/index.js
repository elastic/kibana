import Type from '../type';

export default new Type({
  name: 'image',
  to: {
    render: (input) => {
      return {
        type: 'render',
        as: 'image',
        value: input,
      };
    },
  },
});
