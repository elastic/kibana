export const filterrows = () => ({
  name: 'filterrows',
  aliases: [],
  type: 'datatable',
  context: {
    types: ['datatable'],
  },
  help: 'Filter rows in a datatable based on the return value of a subexpression.',
  args: {
    _: {
      resolve: false,
      aliases: ['fn'],
      types: ['boolean'],
      help:
        'An expression to pass each rows in the datatable into. The expression should return a boolean. ' +
        'A true value will preserve the row, and a false value will remove it.',
    },
  },
  fn(context, { _: fn }) {
    const checks = context.rows.map(row =>
      fn({
        ...context,
        rows: [row],
      })
    );

    return Promise.all(checks)
      .then(results => context.rows.filter((row, i) => results[i]))
      .then(rows => ({
        ...context,
        rows,
      }));
  },
});
