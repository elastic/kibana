export const getCell = () => ({
  name: 'getCell',
  help: 'Fetch a single cell in a table',
  context: {
    types: ['datatable'],
  },
  args: {
    column: {
      types: ['string'],
      aliases: ['_', 'c'],
      help: 'The name of the column value to fetch',
    },
    row: {
      types: ['number'],
      aliases: ['r'],
      help: 'The row number, starting at 0',
      default: 0,
    },
  },
  fn: (context, args) => {
    const row = context.rows[args.row];
    if (!row) throw new Error(`Row not found: ${args.row}`);

    const { column = context.columns[0].name } = args;
    const value = row[column];

    if (typeof value === 'undefined') throw new Error(`Column not found: ${column}`);

    return value;
  },
});
