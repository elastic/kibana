export const neq = () => ({
  name: 'neq',
  type: 'boolean',
  help: 'Return if the context is not equal to the argument',
  args: {
    value: {
      aliases: ['_'],
      types: ['boolean', 'number', 'string', 'null'],
      required: true,
      help: 'The value to compare the context to',
    },
  },
  fn: (context, args) => {
    return context !== args.value;
  },
});
