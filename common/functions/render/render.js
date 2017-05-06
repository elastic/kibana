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
  args: {},
  fn: (context) => context,
});
