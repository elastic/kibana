export const getCell = {
  name: 'getCell',
  help: 'Fetch a single cell in a table',
  context: {
    types: ['datatable'],
  },
  args: {
    _: {
      types: ['string'],
      aliases: ['column', 'c'],
      help: 'The name of the column value to fetch',
    },
    row: {
      types: ['number'],
      aliases: ['r'],
      help: 'The row number, note is the index of the row, NOT the _rowId',
      default: 0,
    },
  },
  fn: (context, args) => {
    const row = context.rows[args.row];

    if (!row) throw new Error (`Row not found: ${args.row}`);
    const value = row[args._];
    if (typeof value === 'undefined') (`Column not found: ${args._}`);

    return value;
  },
};
