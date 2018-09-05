export const context = () => ({
  name: 'context',
  help:
    'Returns whatever you pass into it. This can be useful when you need to use context as argument to a function as a sub-expression',
  args: {},
  fn: context => {
    return context;
  },
});
