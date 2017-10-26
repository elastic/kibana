export const render = {
  name: 'render',
  aliases: [],
  type: 'render',
  help: 'Render an input as a specific element and set element level options such as styling',
  context: {
    types: [
      'render',
    ],
  },
  args: {
    as: {
      types: ['string', 'null'],
      help: 'The element type to use in rendering. You probably want a specialized function instead, such as plot or grid',
    },
    css: {
      types: ['string', 'null'],
      default: '"* > * {}"',
      help: 'Any block of custom CSS to be scoped to this element.',
    },
    containerStyle: {
      types: ['containerStyle', 'null'],
      help: 'Style for the container, including background, border, and opacity',
    },
  },
  fn: (context, args) => {
    if (args.css.length === 0) args.css = '* > * {}';
    context.css = args.css;
    context.containerStyle = args.containerStyle;

    if (args.as) context.as = args.as;

    return context;
  },
};
