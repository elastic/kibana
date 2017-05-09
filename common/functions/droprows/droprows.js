const Fn = require('../fn.js');
const _ = require('lodash');

module.exports = new Fn({
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
});
