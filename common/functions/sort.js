import { sortBy } from 'lodash';

export const sort = () => ({
  name: 'sort',
  type: 'datatable',
  help: 'Sorts a datatable on a column',
  context: {
    types: ['datatable'],
  },
  args: {
    _: {
      types: ['string'],
      aliases: ['column'],
      multi: false, // TODO: No reason you couldn't.
      help:
        'The column to sort on. If column is not specified, the datatable will be sorted on the first column.',
    },
    reverse: {
      types: ['boolean'],
      help:
        'Reverse the sort order. If reverse is not specified, the datatable will be sorted in ascending order.',
    },
  },
  fn: (context, args) => {
    const column = args._ || context.columns[0].name;

    return {
      ...context,
      rows: args.reverse ? sortBy(context.rows, column).reverse() : sortBy(context.rows, column),
    };
  },
});
