export const string = () => ({
  name: 'string',
  aliases: [],
  type: 'string',
  help:
    'Output a string made of other strings. Mostly useful when combined with sub-expressions that output a string, ' +
    ' or something castable to a string',
  args: {
    _: {
      types: ['string'],
      multi: true,
      help: "One or more strings to join together. Don't forget spaces where needed!",
    },
  },
  fn: (context, args) => args._.join(''),
});
