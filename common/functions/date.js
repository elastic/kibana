import moment from 'moment';

const getInputDate = input => {
  // return current date if no input
  if (!input) return new Date();

  // return the input
  return input;
};

export const date = () => ({
  name: 'date',
  type: 'number',
  context: {
    types: ['null'],
  },
  help: 'Returns the current time, or a time parsed from a string, as milliseconds since epoch.',
  args: {
    _: {
      types: ['string', 'null'],
      help:
        'An optional date string to parse into milliseconds since epoch. ' +
        'Can be either a valid Javascript Date input or a string to parse using the format argument. Must be an ISO 8601 string or you must provide the format.',
    },
    format: {
      types: ['string'],
      help:
        'The momentJS format for parsing the optional date string (See https://momentjs.com/docs/#/displaying/).',
    },
  },
  fn: (context, args) => {
    const { _: date, format } = args;
    const useMoment = date && format;
    const outputDate = useMoment ? moment.utc(date, format).toDate() : new Date(getInputDate(date));

    if (isNaN(outputDate.getTime())) throw new Error(`Invalid date input: ${args._}`);

    return outputDate.valueOf();
  },
});
