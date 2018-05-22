export const lte = () => ({
  name: 'lte',
  type: 'boolean',
  help: 'Return if the context is less than or equal to the argument',
  args: {
    _: {
      types: ['boolean', 'number', 'string', 'null'],
      required: true,
      help: 'The value to compare the context to',
    },
  },
  fn: (context, args) => {
    if (typeof context !== typeof args._) return false;
    return context <= args._;
  },
});
