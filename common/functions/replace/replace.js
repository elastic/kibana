export const replace = {
  name: 'replace',
  type: 'string',
  help: 'Use a regular expression to replace parts of a string',
  context: {
    types: ['string'],
  },
  args: {
    regex: {
      types: ['string'],
    },
    replacement: {
      types: ['string'],
    },
  },
  fn: (context, args) => context.replace(new RegExp(args.regex), args.replacement),
};
