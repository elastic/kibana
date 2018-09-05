import { sortBy } from 'lodash';
import { queryDatatable } from '../../../../common/lib/datatable/query';
import { getDemoRows } from './get_demo_rows';

export const demodata = () => ({
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
    const demoRows = getDemoRows(args._);
    let set = {};
    if (args._ === 'ci') {
      set = {
        columns: [
          { name: 'time', type: 'date' },
          { name: 'cost', type: 'number' },
          { name: 'username', type: 'string' },
          { name: 'price', type: 'number' },
          { name: 'age', type: 'number' },
          { name: 'country', type: 'string' },
          { name: 'state', type: 'string' },
          { name: 'project', type: 'string' },
        ],
        rows: sortBy(demoRows, 'time'),
      };
    } else if (args._ === 'shirts') {
      set = {
        columns: [
          { name: 'size', type: 'string' },
          { name: 'color', type: 'string' },
          { name: 'price', type: 'number' },
          { name: 'cut', type: 'string' },
        ],
        rows: demoRows,
      };
    }

    const { columns, rows } = set;
    return queryDatatable(
      {
        type: 'datatable',
        columns,
        rows,
      },
      context
    );
  },
});
