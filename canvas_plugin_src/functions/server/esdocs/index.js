import { keys, map } from 'lodash';
import { getESFieldTypes } from '../../../../server/routes/es_fields/get_es_field_types';
import { flattenHit } from './lib/flatten_hit';
import { buildESRequest } from './lib/build_es_request';

export const esdocs = () => ({
  name: 'esdocs',
  type: 'datatable',
  help:
    'Query elasticsearch and get back raw documents. We recommend you specify the fields you want, ' +
    'especially if you are going to ask for a lot of rows',
  context: {
    types: ['filter'],
  },
  args: {
    index: {
      types: ['string', 'null'],
      default: '_all',
      help: 'Specify an index pattern. Eg "logstash-*"',
    },
    query: {
      types: ['string'],
      aliases: ['_', 'q'],
      help: 'A Lucene query string',
      default: '-_index:.kibana',
    },
    sort: {
      types: ['string', 'null'],
      help: 'Sort directions as "field, direction". Eg "@timestamp, desc" or "bytes, asc"',
    },
    fields: {
      help: 'Comma separated list of fields. Fewer fields will perform better.',
      types: ['string', 'null'],
    },
    metaFields: {
      help: 'Comma separated list of meta fields, eg "_index,_type"',
      types: ['string', 'null'],
    },
    count: {
      types: ['number'],
      default: 100,
      help: 'The number of docs to pull back. Smaller numbers perform better',
    },
  },
  fn: (context, args, handlers) => {
    context.and = context.and.concat([
      {
        type: 'luceneQueryString',
        query: args.query,
      },
    ]);

    function getSort() {
      if (!args.sort) return;

      const sort = args.sort.split(',').map(str => str.trim());
      return [{ [sort[0]]: sort[1] }];
    }

    const fields = args.fields && args.fields.split(',').map(str => str.trim());
    const esRequest = buildESRequest(
      {
        index: args.index,
        body: {
          _source: fields || [],
          sort: getSort(),
          query: {
            bool: {
              must: [{ match_all: {} }],
            },
          },
          size: args.count,
        },
      },
      context
    );

    return handlers.elasticsearchClient('search', esRequest).then(resp => {
      const metaFields = args.metaFields
        ? args.metaFields.split(',').map(field => field.trim())
        : [];
      // TODO: This doesn't work for complex fields such as geo objects. This is really important to fix.
      // we need to pull the field caps for the index first, then use that knowledge to flatten the documents
      const flatHits = map(resp.hits.hits, hit => flattenHit(hit, metaFields));
      const columnNames = keys(flatHits[0]);

      return getESFieldTypes(args.index, columnNames, handlers.elasticsearchClient).then(
        typedFields => {
          return {
            type: 'datatable',
            columns: map(typedFields, (type, name) => ({ name, type })),
            rows: flatHits,
          };
        }
      );
    });
  },
});
