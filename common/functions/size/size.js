const Fn = require('../fn.js');

module.exports = new Fn({
  name: 'size',
  aliases: [],
  type: 'query',
  help: 'Set the number of records a datasource should retrieve',
  context: {
    types: [
      'query',
    ],
  },
  args: {
    _: {
      types: ['number'],
      help: 'Record count to bring back',
    },
  },
  fn: (context, args) => Object.assign({}, context, { size: args._ }),
});
