import moment from 'moment';

export default {
  name: 'rounddate',
  type: 'string',
  help: 'Round dates using a moment formatting string',
  context: {
    types: ['string', 'number'],
  },
  args: {
    _: {
      types: ['string'],
      help: 'Format with which to bucket', // If you need categorization, transform the field.
    },
  },
  fn: (context, args) => {
    return moment(moment(context).format(args._), args._).format();
  },
};
