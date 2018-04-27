import inlineStyle from 'inline-style';

export const font = () => ({
  name: 'font',
  aliases: [],
  type: 'style',
  help: 'Create a font style',
  context: {
    types: ['null'],
  },
  args: {
    size: {
      types: ['number'],
      help: 'Font size (px)',
      default: 12,
    },
    family: {
      types: ['string'],
      default: `'"Open Sans", Helvetica, Arial, sans-serif'`,
      help: 'An acceptable CSS web font string',
    },
    color: {
      types: ['string', 'null'],
      help: 'Text color',
    },
    weight: {
      types: ['string'],
      help:
        'Set the font weight, e.g. normal, bold, bolder, lighter, 100, 200, 300, 400, 500, 600, 700, 800, 900',
      default: 'normal',
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
      default: 'left',
    },
  },
  fn: (context, args) => {
    const weights = [
      'normal',
      'bold',
      'bolder',
      'lighter',
      '100',
      '200',
      '300',
      '400',
      '500',
      '600',
      '700',
      '800',
      '900',
    ];
    const alignments = ['center', 'left', 'right', 'justified'];

    if (!weights.includes(args.weight)) throw new Error(`Invalid font weight: ${args.weight}`);
    if (!alignments.includes(args.align)) throw new Error(`Invalid text alignment: ${args.align}`);

    const spec = {
      fontFamily: args.family,
      fontWeight: args.weight,
      fontStyle: args.italic ? 'italic' : 'normal',
      textDecoration: args.underline ? 'underline' : 'none',
      textAlign: args.align,
      fontSize: `${args.size}px`, // apply font size as a pixel setting
    };

    // conditionally apply styles based on input
    if (args.color) spec.color = args.color;

    return {
      type: 'style',
      spec,
      css: inlineStyle(spec),
    };
  },
});
