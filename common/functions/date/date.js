import moment from 'moment';

export default {
  name: 'date',
  type: 'string',
  help: 'Returns the time, as a string, in the current execution environment',
  args: {
    _: {
      types: ['string'],
      default: '"YYYY-MM-DDTHH:mm:ssZ"',
      'aliases': ['format'],
      help: 'The momentJS format for the output',
    },
  },
  fn: (context, args) => {
    return moment().format(args._);
  },
};
