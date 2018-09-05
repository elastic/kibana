import moment from 'moment';

export const rounddate = () => ({
  name: 'rounddate',
  type: 'number',
  help: 'Round ms since epoch using a moment formatting string. Returns ms since epoch',
  context: {
    types: ['number'],
  },
  args: {
    _: {
      types: ['string'],
      help:
        'MomentJS  Format with which to bucket (See https://momentjs.com/docs/#/displaying/). For example "YYYY-MM" would round to the month',
    },
  },
  fn: (context, args) => {
    if (!args._) return context;
    return moment.utc(moment.utc(context).format(args._), args._).valueOf();
  },
});
