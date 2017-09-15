import Fn from '../fn.js';

export default new Fn({
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
      colors: args._ || ['#01A4A4', '#CC6666', '#D0D102', '#616161', '#00A1CB', '#32742C', '#F18D05', '#113F8C', '#61AE24', '#D70060'],
      gradient: args.gradient,
    };
  },
});
