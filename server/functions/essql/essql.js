import { map, zipObject } from 'lodash';
import { buildBoolArray } from './build_bool_array';
import { normalizeType } from './normalize_type';
import { sanitizeName } from './sanitize_name';

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
        path: '/_xpack/sql?format=json',
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
        const columns = res.columns.map(({ name, type }) => {
          return { name: sanitizeName(name), type: normalizeType(type) };
        });
        const columnNames = map(columns, 'name');
        const rows = res.rows.map(row => zipObject(columnNames, row));
        return {
          type: 'datatable',
          columns,
          rows,
        };
      })
      .catch(e => {
        if (e.message.indexOf('parsing_exception') > -1)
          throw new Error(
            `Couldn't parse Elasticsearch SQL query. You may need to add double quotes to names containing special characters. Check your query and try again. Error: ${
              e.message
            }`
          );
        throw new Error(`Unexpected error from Elasticsearch: ${e.message}`);
      });
  },
});
