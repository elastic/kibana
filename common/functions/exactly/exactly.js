import Fn from '../fn.js';

export default new Fn({
  name: 'exactly',
  aliases: [],
  type: 'filter',
  context: {
    types: ['filter'],
  },
  help: 'Create a filter that matches a given column for a perfectly exact value',
  args: {
    column: {
      type: ['string'],
      aliases: ['field', 'c'],
      help: 'The column or field to attach the filter to',
    },
    value: {
      types: [
        'string',
      ],
      'aliases': ['v', 'val'],
      help: 'The value to match exactly, including white space and capitalization',
    },
  },
  fn: (context, args) => {
    const { value, column } = args;

    context.and.push({
      type: 'exactly',
      value,
      column,
    });

    return context;
  },
});
