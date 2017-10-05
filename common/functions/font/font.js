import inlineStyle from 'inline-style';
import Fn from '../fn.js';

export default new Fn({
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
      default: 'normal',
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
      default: 'left',
      help: 'Horizontal text alignment',
    },
  },
  fn: (context, args) => {
    const spec = {
      ...context.spec,
      fontSize: `${args.size}px`,
      fontFamily: args.family,
      fontWeight: args.weight,
      fontStyle: args.italic ? 'italic' : 'normal',
      textDecoration: args.underline ? 'underline' : 'none',
      textAlign: args.align,
      color: args.color,
    };

    return {
      type: 'style',
      spec,
      css: inlineStyle(spec),
    };
  },
});
