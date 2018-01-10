import moment from 'moment';

export const rounddate = {
  name: 'rounddate',
  type: 'number',
  help:
    'Round ms since epoch, or an ISO8601 formatted string, using a moment formatting string. Returns ms since epoch',
  context: {
    types: ['number', 'string'],
  },
  args: {
    _: {
      types: ['string'],
      help:
        'MomentJS  Format with which to bucket (See https://momentjs.com/docs/#/displaying/). For example "YYYY-MM" would round to the month',
    },
  },
  fn: (context, args) => {
    return moment(moment(context).format(args._), args._).valueOf();
  },
};
