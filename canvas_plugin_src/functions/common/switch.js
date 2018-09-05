export const switchFn = () => ({
  name: 'switch',
  help: 'Perform conditional logic with multiple conditions',
  args: {
    case: {
      types: ['case'],
      aliases: ['_'],
      resolve: false,
      multi: true,
      help: 'The list of conditions to check',
    },
    default: {
      aliases: ['finally'],
      resolve: false,
      help: 'The default case if no cases match',
    },
  },
  fn: async (context, args) => {
    const cases = args.case || [];
    for (let i = 0; i < cases.length; i++) {
      const { matches, result } = await cases[i]();
      if (matches) return result;
    }
    if (typeof args.default !== 'undefined') return await args.default();
    return context;
  },
});
