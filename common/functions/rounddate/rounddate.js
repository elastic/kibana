import Fn from '../fn.js';
import moment from 'moment';

module.exports = new Fn({
  name: 'rounddate',
  type: 'number',
  help: 'Round dates using a moment formatting string',
  context: {
    types: ['string'],
  },
  args: {
    format: {
      types: ['string'],
      help: 'Format with which to bucket', // If you need categorization, transform the field.
    },
  },
  fn: (context, args) => {
    return moment(moment(context).format(args.format), args.format).valueOf();
  },
});
