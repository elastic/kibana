import moment from 'moment';
export const formatdate = () => ({
  name: 'formatdate',
  type: 'string',
  help: 'Output a ms since epoch number as a formatted string',
  context: {
    types: ['number'],
  },
  args: {
    _: {
      types: ['string'],
      help: 'MomentJS Format with which to bucket (See https://momentjs.com/docs/#/displaying/)',
    },
  },
  fn: (context, args) => {
    if (!args._) return moment.utc(new Date(context)).toISOString();
    return moment.utc(new Date(context)).format(args._);
  },
});
