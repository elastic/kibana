import numeral from '@elastic/numeral';

export const formatnumber = () => ({
  name: 'formatnumber',
  type: 'string',
  help: 'Turn a number into a string using a NumberJS format',
  context: {
    types: ['number'],
  },
  args: {
    _: {
      types: ['string'],
      help: 'NumeralJS format string http://numeraljs.com/#format',
    },
  },
  fn: (context, args) => {
    if (!args._) return String(context);
    return numeral(context).format(args._);
  },
});
