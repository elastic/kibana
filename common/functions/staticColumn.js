import { getType } from '../lib/get_type';

export const staticColumn = {
  name: 'staticColumn',
  type: 'datatable',
  help: 'Add a column with a static value.',
  context: {
    types: ['datatable'],
  },
  args: {
    _: {
      types: ['string'],
      aliases: ['column'],
      help: 'The name of the new column column',
    },
    value: {
      types: ['string', 'number', 'boolean', 'null'],
      help: 'The value to insert in each column. Tip: use a sub-expression to rollup other columns into a static value',
    },
  },
  fn: (context, args) => {
    const rows = context.rows.map(row => ({ ...row, [args._]: args.value }));
    const columns = context.columns.concat([{ type: getType(rows[0][args._]), name: args._ }]);

    return {
      type: 'datatable',
      columns,
      rows,
    };
  },
};
