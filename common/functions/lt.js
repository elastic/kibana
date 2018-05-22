export const lt = () => ({
  name: 'lt',
  type: 'boolean',
  help: 'Return if the context is less than the argument',
  args: {
    _: {
      types: ['boolean', 'number', 'string', 'null'],
      required: true,
      help: 'The value to compare the context to',
    },
  },
  fn: (context, args) => {
    if (typeof context !== typeof args._) return false;
    return context < args._;
  },
});
