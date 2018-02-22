export const axisConfig = () => ({
  name: 'axisConfig',
  aliases: [],
  type: 'axisConfig',
  context: {
    types: ['datatable'],
  },
  help: 'Configure axis of a visualization',
  args: {
    show: {
      types: ['boolean'],
      help: 'Show the axis labels?',
      default: true,
    },
    position: {
      types: ['string'],
      help: 'Position of the axis labels',
    },
  },
  fn: (context, args) => {
    return {
      type: 'axisConfig',
      ...args,
    };
  },
});
