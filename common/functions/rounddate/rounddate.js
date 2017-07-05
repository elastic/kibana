import Fn from '../fn.js';
import moment from 'moment';
import { find } from 'lodash';

module.exports = new Fn({
  name: 'rounddate',
  type: 'datatable',
  help: 'Bucket date objects using a moment formatting string',
  context: {
    types: ['datatable'],
  },
  args: {
    // Dimensions
    column: {
      types: ['string', 'null'],
      help: 'A date column to bucket on',
    },
    format: {
      types: ['string'],
      help: 'Format with which to bucket', // If you need categorization, transform the field.
    },
  },
  fn: (context, args) => {
    function getColumnDef(field) {
      return find(context.columns, { name: field });
    }

    console.log(args, context.columns);
    const { column, format } = args;
    if (!getColumnDef(column)) throw new Error('No such column');
    if (getColumnDef(column).type !== 'date') throw new Error('Column must be a date');

    return Object.assign({}, context, { rows: context.rows.map(row => {
      return Object.assign(row, {
        [column]: moment(moment(row[column]).format(format), format).valueOf(),
      });
    }) });
  },
});
