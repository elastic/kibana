export default {
  name: 'sleep',
  help: 'Introduces a delay to expressions. This should not be used in production. If you need this, you did something wrong',
  args: {
    _: {
      types: [
        'number',
      ],
      default: 0,
      'aliases': [],
      help: 'The number of milliseconds to wait',
    },
  },
  fn: (context, args) => {
    return new Promise(function (resolve) {
      setTimeout(() => resolve(context), args._);
    });
  },
};
