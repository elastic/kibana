export const any = () => ({
  name: 'any',
  type: 'boolean',
  help: 'Return true if any of the conditions are true',
  args: {
    _: {
      types: ['boolean', 'null'],
      required: true,
      multi: true,
      help: 'The conditions to check',
    },
  },
  fn: (context, args) => {
    const conditions = args._ || [];
    return conditions.some(Boolean);
  },
});
