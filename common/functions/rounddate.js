import moment from 'moment';

export const rounddate = {
  name: 'rounddate',
  type: 'string',
  help: 'Round Moment parsable date strings (or ms since epoch) using a moment formatting string. Returns an ISO8601 string',
  context: {
    types: ['string', 'number'],
  },
  args: {
    _: {
      types: ['string'],
      help: 'MomentJS  Format with which to bucket (See https://momentjs.com/docs/#/displaying/)',
    },
  },
  fn: (context, args) => {
    return moment(moment(context).format(args._), args._).format();
  },
};
