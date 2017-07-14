const Fn = require('../fn.js');

module.exports = new Fn({
  name: 'render',
  aliases: [],
  type: 'render',
  help: 'Render an object with its default renderer, if one exists',
  context: {
    types: [
      'render',
    ],
  },
  args: {
    as: {
      types: ['string', 'null'],
      help: 'The element type to use in rendering. You probably want a specialized function instead, such as plot() or grid()',
    },
    css: {
      types: ['string', 'null'],
      default: '* > * {}',
      help: 'Any block of custom CSS to be scoped to this element.',
    },
  },
  fn: (context, args) => {
    context.css = args.css;
    if (args.as) context.as = args.as;
    console.log(context);
    return context;
  },
});
