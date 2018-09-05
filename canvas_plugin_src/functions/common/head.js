import { take } from 'lodash';

export const head = () => ({
  name: 'head',
  aliases: [],
  type: 'datatable',
  help: 'Get the first N rows from the datatable. Also see `tail`',
  context: {
    types: ['datatable'],
  },
  args: {
    _: {
      types: ['number'],
      help: 'Return this many rows from the beginning of the datatable',
      default: 1,
    },
  },
  fn: (context, args) => ({
    ...context,
    rows: take(context.rows, args._),
  }),
});
