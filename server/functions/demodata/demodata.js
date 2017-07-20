const Fn = require('../../../common/functions/fn.js');
const rows = require('./mock.json');
const _ = require('lodash');
const moment = require('moment');
import { queryDatatable } from '../../../common/lib/datatable/query';

module.exports = new Fn({
  name: 'demodata',
  aliases: [],
  type: 'datatable',
  help: 'Project CI times with usernames and country',
  context: {
    types: ['query'],
  },
  args: {},
  fn: (context) => {
    return queryDatatable({
      type: 'datatable',
      columns: [
        { name: '_rowId', type: 'number' },
        { name: 'time', type: 'date' },
        { name: 'cost', type: 'number' },
        { name: 'username', type: 'string' },
        { name: 'price', type: 'number' },
        { name: 'age', type: 'number' },
        { name: 'country', type: 'string' },
        { name: 'state', type: 'string' },
        { name: 'project', type: 'string' },
      ],
      rows: _.map(_.cloneDeep(rows), (row, i) => _.assign(row, {
        _rowId: i,
        time: moment(moment(row.time).format('YYYY-MM-DD'), 'YYYY-MM-DD').format(),
      })),
    }, context);
  },
});
