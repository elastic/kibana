import inlineStyle from 'inline-style';

export const font = {
  name: 'font',
  aliases: [],
  type: 'style',
  help: 'Create a font style',
  context: {
    types: ['style'],
  },
  args: {
    size: {
      types: ['number', 'null'],
      help: 'Font size',
    },
    family: {
      types: ['string', 'null'],
      default: `'"Open Sans", Helvetica, Arial, sans-serif'`,
      help: 'An acceptable CSS web font string',
    },
    color: {
      types: ['string', 'null'],
      help: 'Text color',
    },
    weight: {
      types: ['string'],
      help: 'normal, bold, bolder, lighter',
    },
    underline: {
      types: ['boolean'],
      default: false,
      help: 'Underline the text, true or false',
    },
    italic: {
      types: ['boolean'],
      default: false,
      help: 'Italicize, true or false',
    },
    align: {
      types: ['string'],
      help: 'Horizontal text alignment',
    },
  },
  fn: (context, args) => {
    const spec = {
      ...context.spec,
      fontFamily: args.family,
      fontWeight: args.weight,
      fontStyle: args.italic ? 'italic' : 'normal',
      textDecoration: args.underline ? 'underline' : 'none',
    };

    // conditionally apply styles based on input
    if (args.color) spec.color = args.color;
    if (args.weight) spec.fontWeight = args.weight;
    if (args.align) spec.textAlign = args.align;

    // apply font size as a pixel setting
    if (args.size != null) spec.fontSize = `${args.size}px`;

    return {
      type: 'style',
      spec,
      css: inlineStyle(spec),
    };
  },
};
