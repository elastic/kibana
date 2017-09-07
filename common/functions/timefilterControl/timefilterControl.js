import Fn from '../fn.js';

export default new Fn({
  name: 'timefilterControl',
  aliases: [],
  type: 'render',
  help: 'Create a timefilter for querying a source',
  args: {
    column: {
      type: ['string'],
      aliases: ['field', 'c'],
      help: 'The column or field to attach the filter to',
    },
  },
  fn: (context, args) => {
    return {
      type: 'render',
      as: 'time_filter',
      value: args,
    };
  },
});
