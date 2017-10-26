import moment from 'moment';

export const date = {
  name: 'date',
  type: 'string',
  help: 'Returns the time, as a string, in the current execution environment.' +
  ' Be careful with this if your server and client have different times',
  args: {
    _: {
      types: ['string'],
      default: '"YYYY-MM-DDTHH:mm:ssZ"',
      'aliases': ['format'],
      help: 'The momentJS format for the output (See https://momentjs.com/docs/#/displaying/)',
    },
  },
  fn: (context, args) => {
    return moment().format(args._);
  },
};
