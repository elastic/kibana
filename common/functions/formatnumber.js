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
    return numeral(context).format(args._);
  },
});
