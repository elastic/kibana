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
      help: 'Position of the axis labels. Eg, top, bottom, left, and right.',
      default: '',
    },
  },
  fn: (context, args) => {
    const positions = ['top', 'bottom', 'left', 'right', ''];
    if (!positions.includes(args.position)) throw new Error(`Invalid position ${args.position}`);
    return {
      type: 'axisConfig',
      ...args,
    };
  },
});
