export const all = () => ({
  name: 'all',
  help: 'Return true if all of the conditions are true',
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
    return conditions.every(Boolean);
  },
});
