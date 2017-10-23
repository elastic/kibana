import { palettes } from '../../lib/palettes';
export default {
  name: 'palette',
  aliases: [],
  type: 'palette',
  help: 'Get a color palette',
  context: {},
  args: {
    _: {
      multi: true,
      types: ['string'],
      help: 'Palette colors, rgba, hex, or HTML color string',
    },
    gradient: {
      types: ['boolean', 'null'],
      default: false,
      help: 'Should we prefer to make a gradient where supported and useful?',
    },
  },
  fn: (context, args) => {
    return {
      type: 'palette',
      colors: args._ || palettes.paul_tor_14.colors,
      gradient: args.gradient,
    };
  },
};
