import dateMath from '@elastic/datemath';

export default {
  name: 'timefilter',
  aliases: [],
  type: 'filter',
  context: {
    types: ['filter'],
  },
  help: 'Create a timefilter for querying a source',
  args: {
    column: {
      type: ['string'],
      aliases: ['field', 'c'],
      default: '@timestamp',
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
      type: 'time',
      from: null,
      to: null,
      column,
    };

    function parseAndValidate(str) {
      if (!str) return;
      const moment = dateMath.parse(str);
      if (!moment.isValid()) throw new Error(`Invalid date/time string ${str}`);
      return moment.toISOString();
    }

    if (to != null) {
      filter.to = parseAndValidate(to);
    }

    if (from != null) {
      filter.from = parseAndValidate(from);
    }

    context.and.push(filter);

    return context;
  },
};
