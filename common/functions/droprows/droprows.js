import _ from 'lodash';

export const droprows = {
  name: 'droprows',
  aliases: [],
  type: 'datatable',
  help: 'Removes rows in a data table',
  context: {
    types: [
      'datatable',
    ],
  },
  args: {},
  fn: (context) =>
    _.assign(context, {
      rows: [],
    }),
};
