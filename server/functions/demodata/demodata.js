const Fn = require('../../../common/functions/fn.js');
const rows = require('./mock.json');
const _ = require('lodash');

module.exports = new Fn({
  name: 'demodata',
  aliases: [],
  type: 'datatable',
  help: 'Returns some crappy demo data',
  context: {},
  args: {},
  fn: () => {
    return {
      type: 'datatable',
      columns: [
        { name: '_rowId', type: 'number' },
        { name: 'time', type: 'date' },
        { name: 'cost', type: 'number' },
        { name: 'username', type: 'string' },
        { name: 'price', type: 'number' },
        { name: 'age', type: 'number' },
        { name: 'country', type: 'string' }
      ],
      rows: _.map(_.cloneDeep(rows), (row, i) => _.assign(row, { _rowId: i }))
    };
  }
});
