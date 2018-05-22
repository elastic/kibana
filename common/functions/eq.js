export const eq = () => ({
  name: 'eq',
  type: 'boolean',
  help: 'Return if the context is equal to the argument',
  args: {
    _: {
      types: ['boolean', 'number', 'string', 'null'],
      required: true,
      help: 'The value to compare the context to',
    },
  },
  fn: (context, args) => {
    return context === args._;
  },
});
