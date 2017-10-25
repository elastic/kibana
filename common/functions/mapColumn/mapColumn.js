export const mapColumn = {
  name: 'mapColumn',
  aliases: ['mc'], // midnight commander. So many times I've launched midnight commander instead of moving a file.
  type: 'datatable',
  help: 'Replace value in column with output of a function',
  context: {
    types: ['datatable'],
  },
  args: {
    column: {
      types: ['string'],
      aliases: ['_'],
    },
    function: {
      types: ['function'],
      aliases: ['fn'],
    },
    dest: {
      types: ['string', 'null'],
    },
  },
  fn: (context, args) => {
    if (args.dest) {
      context.columns.push({ name: args.dest, type: 'string' });
      context.columns[args.dest] = { type: 'string' };
    } else {
      args.dest = args.column;
    }

    const rowPromises = context.rows.map(row => {
      return args.function(row[args.column])
        .then(val => {
          return Object.assign({}, row, { [args.dest]: val });
        });
    });


    return Promise.all(rowPromises).then(rows => Object.assign({}, context, { rows: rows }));
  },
};
