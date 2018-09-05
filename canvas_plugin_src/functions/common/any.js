export const any = () => ({
  name: 'any',
  type: 'boolean',
  help: 'Return true if any of the conditions are true',
  args: {
    condition: {
      aliases: ['_'],
      types: ['boolean', 'null'],
      required: true,
      multi: true,
      help: 'One or more conditions to check',
    },
  },
  fn: (context, args) => {
    const conditions = args.condition || [];
    return conditions.some(Boolean);
  },
});
