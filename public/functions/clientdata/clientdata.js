const Fn = require('../../../common/functions/fn.js');
const _ = require('lodash');
const cheap = require('./cheap.json');

module.exports = new Fn({
  name: 'clientdata',
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
        { name: 'country', type: 'string' },
      ],
      rows: _.cloneDeep(cheap),
    };
  },
});
