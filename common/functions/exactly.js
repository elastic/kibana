export const exactly = () => ({
  name: 'exactly',
  aliases: [],
  type: 'filter',
  context: {
    types: ['filter'],
  },
  help: 'Create a filter that matches a given column for a perfectly exact value',
  args: {
    column: {
      types: ['string'],
      aliases: ['field', 'c'],
      help: 'The column or field to attach the filter to',
    },
    value: {
      types: ['string'],
      aliases: ['v', 'val'],
      help: 'The value to match exactly, including white space and capitalization',
    },
  },
  fn: (context, args) => {
    const { value, column } = args;

    const filter = {
      type: 'exactly',
      value,
      column,
    };

    return { ...context, and: [...context.and, filter] };
  },
});
