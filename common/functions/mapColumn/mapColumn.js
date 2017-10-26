export const mapColumn = {
  name: 'mapColumn',
  aliases: ['mc'], // midnight commander. So many times I've launched midnight commander instead of moving a file.
  type: 'datatable',
  help: 'Replace value in column with output of an expression that will receive the current value of the column',
  context: {
    types: ['datatable'],
  },
  args: {
    _: {
      types: ['string'],
      aliases: ['column'],
      help: 'The column containing values to pass into the expression',
    },
    expression: {
      types: ['function'],
      aliases: ['exp', 'fn'],
      help: 'A canvas expression to pass each value in the column to',
    },
    destination: {
      aliases: ['dest', 'd'],
      types: ['string', 'null'],
      help: 'Instead of overwriting the column value, put the new value in this column. Use alterColumn if you need to change the type',
    },
  },
  fn: (context, args) => {
    if (args.destination) {
      context.columns.push({ name: args.destination, type: 'string' });
      context.columns[args.destination] = { type: 'string' };
    } else {
      args.destination = args._;
    }

    const rowPromises = context.rows.map(row => {
      return args.expression(row[args._])
        .then(val => {
          return Object.assign({}, row, { [args.destination]: val });
        });
    });


    return Promise.all(rowPromises).then(rows => Object.assign({}, context, { rows: rows }));
  },
};
