const Fn = require('../fn.js');
const _ = require('lodash');

module.exports = new Fn({
  name: 'mapColumn',
  aliases: ['mc'], // midnight commander. So many times I've launched midnight commander instead of moving a file.
  type: 'datatable',
  help: 'Replace value in column with output of a function',
  context: {
    types: ['datatable']
  },
  args: {
    column: {
      types: ['string'],
      aliases: ['_']
    },
    function: {
      types: ['function'],
      aliases: ['fn']
    },
    dest: {
      types: ['string', 'null']
    }
  },
  fn: (context, args) => {
    if (args.dest) {
      context.columns[args.dest] = { type: 'string' };
    } else {
      args.dest = args.column;
    }

    const rowPromises = _.map(context.rows, row => {
      return args.function(row[args.column])
        .then(val => _.assign(row, { [args.dest]: val }));
    });

    return Promise.all(rowPromises).then(rows => _.assign(context, { rows: rows }));
  }
});
