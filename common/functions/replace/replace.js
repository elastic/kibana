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
      help: 'A JavasScript regular expression. You can use capture groups here.',
    },
    replacement: {
      types: ['string'],
      help: 'The replacement for the matching parts of string. Capture groups can be accessed by their index, eg $1',
    },
  },
  fn: (context, args) => context.replace(new RegExp(args.regex), args.replacement),
};
