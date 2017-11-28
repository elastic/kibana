import moment from 'moment';
import rows from './mock.json';
import { queryDatatable } from '../../../common/lib/datatable/query';

function mapRecord(row, i, adjustedTime) {
  return Object.assign({}, row, { time: adjustedTime || row.time });
}

export const demoprices = {
  name: 'demoprices',
  aliases: [],
  type: 'datatable',
  help: 'Product pricing data in a variety of intervals',
  context: {
    types: ['filter'],
  },
  args: {
    bucket: {
      types: ['string'],
      help: 'Time interval to bucket by. Second and minute will produce a lot of rows, so maybe don\'t use those.',
      default: 'hour', // second, minute, hour, day, etc
    },
  },
  fn: (context, args) => {
    const getRows = (bucket) => {
      // data is already in seconds, so do nothing
      if (bucket === 'second') {
        return rows.map((row, i) => mapRecord(row, i, null));
      }

      const mappedRows = rows.reduce((acc, row, i) => {
        const adjustedTime = moment(row.time).startOf(bucket).toISOString();

        // nothing in pending, queue row
        if (acc.pending.length === 0) {
          acc.pending.push(mapRecord(row, i, adjustedTime));
          return acc;
        }

        // get pending record and adjust time
        const firstRow = acc.pending[0];
        const isLastRow = rows.length === i + 1;

        // new bucket, write the bucketed records
        if (isLastRow || firstRow.time !== adjustedTime) {
          const avgPrice = acc.pending.reduce((a, r) => a += r.price, 0) / acc.pending.length;
          acc.bucketed.push({
            time: adjustedTime,
            name: row.name,
            price: avgPrice,
          });
          acc.pending = [];
        } else {
          acc.pending.push(mapRecord(row, i, adjustedTime));
        }

        return acc;
      }, { pending: [], bucketed: [] });

      return mappedRows.bucketed;
    };

    const bucketedRows = getRows(args.bucket);

    return queryDatatable({
      type: 'datatable',
      columns: [
        { name: 'price', type: 'number' },
        { name: 'name', type: 'string' },
        { name: 'time', type: 'date' },
      ],
      rows: bucketedRows,
    }, context);

  },
};
