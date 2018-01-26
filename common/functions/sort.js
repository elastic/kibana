import { sortBy } from 'lodash';

export const sort = () => ({
  name: 'sort',
  aliases: [],
  type: 'datatable',
  help: 'Sorts a datatable on a column',
  context: {
    types: ['datatable'],
  },
  args: {
    _: {
      types: ['string'],
      aliases: [],
      multi: false, // TODO: No reason you couldn't.
      help: 'The column to sort on',
    },
    reverse: {
      types: ['boolean'],
      help: 'Reverse the sort order',
    },
  },
  fn: (context, args) => ({
    ...context,
    rows: args.reverse ? sortBy(context.rows, args._).reverse() : sortBy(context.rows, args._),
  }),
});
