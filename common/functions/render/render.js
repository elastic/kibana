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
    css: {
      types: ['string', 'null'],
      help: 'Any block of custom CSS to be scoped to this element.',
    },
  },
  fn: (context, args) => {
    context.css = args.css;
    return context;
  },
});
