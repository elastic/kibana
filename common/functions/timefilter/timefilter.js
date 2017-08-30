import Fn from '../fn.js';
import dateMath from '@elastic/datemath';

export default new Fn({
  name: 'timefilter',
  aliases: [],
  type: 'query',
  context: {
    types: ['query'],
  },
  help: 'Create a timefilter for querying a source',
  args: {
    column: {
      type: ['string'],
      aliases: ['field', 'c'],
      help: 'The column or field to attach the filter to',
    },
    from: {
      types: [
        'string',
      ],
      'aliases': ['f', 'start'],
      help: 'Beginning of the range, in ISO8601 or Elasticsearch datemath format',
    },
    to: {
      types: [
        'string',
      ],
      'aliases': ['t', 'end'],
      help: 'End of the range, in ISO8601 or Elasticsearch datemath format',
    },
  },
  fn: (context, args) => {
    const { from, to, column } = args;
    const filter = {
      type: 'filter',
      value: {
        type: 'time',
        from: null,
        to: null,
        column,
      },
    };

    function parseAndValidate(str) {
      if (!str) return;
      const moment = dateMath.parse(str);
      if (!moment.isValid()) throw new Error(`Invalid date/time string ${str}`);
      return moment.toISOString();
    }

    if (to != null) {
      filter.value.to = parseAndValidate(to);
    }

    if (from != null) {
      filter.value.from = parseAndValidate(from);
    }

    context.and.push(filter);

    return context;
  },
});
