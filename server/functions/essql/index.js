import { map, zipObject } from 'lodash';
import { buildBoolArray } from './build_bool_array';
import { normalizeType } from './normalize_type';

export const essql = () => ({
  name: 'essql',
  type: 'datatable',
  context: {
    types: ['filter'],
  },
  help: 'Elasticsearch SQL',
  args: {
    _: {
      aliases: ['query', 'q'],
      types: ['string'],
      help: 'SQL query',
    },
    count: {
      types: ['number'],
      default: 1000,
    },
  },
  fn(context, args, helpers) {
    return helpers
      .elasticsearchClient('transport.request', {
        path: '_xpack/sql?format=json',
        method: 'POST',
        body: {
          fetch_size: args.count,
          query: args._,
          filter: {
            bool: {
              must: [{ match_all: {} }, ...buildBoolArray(context.and)],
            },
          },
        },
      })
      .then(res => {
        const columns = res.columns.map(col => ({ ...col, type: normalizeType(col.type) }));
        const columnNames = map(columns, 'name');
        const rows = res.rows.map(row => zipObject(columnNames, row));
        return {
          type: 'datatable',
          columns,
          rows,
        };
      });
  },
});
