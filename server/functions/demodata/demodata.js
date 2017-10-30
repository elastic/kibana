import _ from 'lodash';
import moment from 'moment';
import ci from './ci.json';
import shirts from './shirts.json';
import { queryDatatable } from '../../../common/lib/datatable/query';

const sets = {
  ci: {
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
    rows: _.map(_.cloneDeep(ci), (row, i) => _.assign(row, {
      _rowId: i,
      time: moment(moment(row.time).format('YYYY-MM-DD'), 'YYYY-MM-DD').format(),
    })),
  },
  shirts: {
    columns: [
      { name: '_rowId', type: 'number' },
      { name: 'size', type: 'string' },
      { name: 'color', type: 'string' },
      { name: 'price', type: 'number' },
      { name: 'cut', type: 'string' },
    ],
    rows: shirts,
  },
};

export const demodata = {
  name: 'demodata',
  aliases: [],
  type: 'datatable',
  help: 'A mock data set that includes project CI times with usernames, countries and run phases.',
  context: {
    types: ['filter'],
  },
  args: {
    _: {
      types: ['string', 'null'],
      aliases: ['type'],
      help: 'The name of the demo data set to use',
      default: 'ci',
    },
  },
  fn: (context, args) => {
    const { columns, rows } = sets[args._];
    return queryDatatable({
      type: 'datatable',
      columns,
      rows,
    }, context);
  },
};
