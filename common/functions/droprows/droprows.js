import _ from 'lodash';

export default {
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
