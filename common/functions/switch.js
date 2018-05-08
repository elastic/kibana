export const switchFn = () => ({
  name: 'switch',
  help: 'Perform conditional logic with multiple conditions',
  args: {
    _: {
      types: ['case'],
      aliases: ['cases'],
      multi: true,
      help: 'The list of conditions to check',
    },
    default: {
      aliases: ['finally'],
      help: 'The default case if no cases match',
    },
  },
  fn: (context, args) => {
    const cases = args._ || [];
    const matchingCase = cases.find(c => c.matches);
    if (matchingCase) return matchingCase.result;
    if (args.default) return args.default;
    return context;
  },
});
