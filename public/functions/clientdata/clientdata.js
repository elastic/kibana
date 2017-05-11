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
        { name: '_rowId',   type: 'number', role: 'measure' },
        { name: 'time',     type: 'date',   role: 'dimension' },
        { name: 'cost',     type: 'number', role: 'measure' },
        { name: 'username', type: 'string', role: 'dimension' },
        { name: 'price',    type: 'number', role: 'measure' },
        { name: 'age',      type: 'number', role: 'measure' },
        { name: 'country',  type: 'string', role: 'dimension' },
      ],
      rows: _.cloneDeep(cheap),
    };
  },
});
