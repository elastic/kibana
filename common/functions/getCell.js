export const getCell = () => ({
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
      help: 'The row number, starting at 0',
      default: 0,
    },
  },
  fn: (context, args) => {
    const row = context.rows[args.row];

    if (!row) throw new Error(`Row not found: ${args.row}`);
    if (!args._) args._ = context.columns[0].name;
    const value = row[args._];

    if (typeof value === 'undefined') throw new Error(`Column not found: ${args._}`);

    return value;
  },
});
