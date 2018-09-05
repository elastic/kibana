import { takeRight } from 'lodash';

export const tail = () => ({
  name: 'tail',
  aliases: [],
  type: 'datatable',
  help: 'Get the last N rows from the end of a datatable. Also see `head`',
  context: {
    types: ['datatable'],
  },
  args: {
    _: {
      types: ['number'],
      help: 'Return this many rows from the end of the datatable',
    },
  },
  fn: (context, args) => ({
    ...context,
    rows: takeRight(context.rows, args._),
  }),
});
