import _ from 'lodash';

export const sort = {
  name: 'sort',
  aliases: [],
  type: 'datatable',
  help: 'Sorts a datatable on a column',
  context: {
    types: [
      'datatable',
    ],
  },
  args: {
    _: {
      types: [
        'string',
      ],
      'aliases': [],
      'multi': false, // TODO: No reason you couldn't.
      help: 'The column to sort on',
    },
  },
  fn: (context, args) =>
    _.assign(context, {
      rows: _.sortBy(context.rows, args._),
    }),
};
