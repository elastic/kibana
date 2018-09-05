export const rowCount = () => ({
  name: 'rowCount',
  aliases: [],
  type: 'number',
  context: {
    types: ['datatable'],
  },
  help:
    'Return the number of rows. Pair with ply to get the count of unique column values, or combinations of unique column values.',
  args: {},
  fn: context => context.rows.length,
});
