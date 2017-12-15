import moment from 'moment';

export const formatdate = {
  name: 'formatdate',
  type: 'string',
  help: 'Output a ms since epoch number, or ISO8601, as a formatted string',
  context: {
    types: ['number', 'string'],
  },
  args: {
    _: {
      types: ['string'],
      help: 'MomentJS Format with which to bucket (See https://momentjs.com/docs/#/displaying/)',
    },
  },
  fn: (context, args) => {
    return moment(context).format(args._);
  },
};
