import moment from 'moment';

export const date = {
  name: 'date',
  type: 'number',
  context: {
    types: ['null'],
  },
  help: 'Returns the current time, or a time parsed from a string, as milliseconds since epoch',
  args: {
    _: {
      types: ['string', 'null'],
      help: 'An optional date string to parse into milliseconds since epoch',
    },
    format: {
      types: ['string', 'null'],
      help: 'The momentJS format for parsing the optional date string (See https://momentjs.com/docs/#/displaying/)',
    },
  },
  fn: (context, args) => {
    if (!args._) return moment().valueOf();
    if (!args.format) return moment(args._).valueOf();
    return moment(args._, args.format).valueOf();
  },
};
