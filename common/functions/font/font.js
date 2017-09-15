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
      types: ['string', 'null'],
      help: 'The element type to use in rendering. You probably want a specialized function instead, such as plot or grid',
    },
    family: {
      types: ['string', 'null'],
      default: `'"Open Sans", Helvetica, Arial, sans-serif'`,
      help: 'Any block of custom CSS to be scoped to this element.',
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
    align: {
      types: ['string'],
      default: 'left',
      help: 'Horizontal text alignment',
    },
  },
  fn: (context, args) => {
    return {
      type: 'style',
      spec: {
        ...context.spec,
        fontSize: args.size,
        fontFamily: args.family,
        fontWeight: args.weight,
        textDecoration: args.underline ? 'underline' : false,
        textAlign: args.align,
      },
      css: 'TODO: Convert to css string',
    };
  },
});
