import elasticsearch from 'elasticsearch';
import Fn from '../../../common/functions/fn.js';
import flattenHit from './lib/flatten_hit';
import { buildESRequest } from './lib/build_es_request';
import { keys, map } from 'lodash';
import { getESFieldTypes } from '../../routes/es_fields/get_es_field_types';

const client = new elasticsearch.Client({
  host: 'localhost:9200',
});



export default new Fn({
  name: 'esdocs',
  context: {
    types: ['query'],
  },
  args: {
    index: {
      types: ['string', 'null'],
      default: '_all',
    },
    q: {
      types: ['string'],
      aliases: ['query'],
      help: 'A Lucene query string',
      default: '-_index:.kibana',
    },
    sort: {
      types: ['string'],
      help: 'Sort directions as "field, direction". Eg "@timestamp, desc" or "bytes, asc"',
    },
    // TODO: This doesn't work
    fields: {
      help: 'Comma seperated list of fields. Fewer fields will perform better.',
      types: ['string'],
      default: '',
    },
  },
  type: 'datatable',
  help: 'Query elasticsearch and get back raw documents.',
  fn: (context, args) => {

    context.and = context.and
      .concat([{ // q
        type: 'filter',
        value: {
          type: 'luceneQueryString',
          query: args.q,
        },
      }]);


    function getSort() {
      if (!args.sort) return;

      const sort = args.sort.split(',').map(str => str.trim());
      return [{ [sort[0]]: sort[1] }];
    }

    const esRequest = buildESRequest({
      index: args.index,
      body: {
        _source: args.fields ? args.fields.split(',').map(str => str.trim()) : undefined,
        sort: getSort(),
        query: {
          bool: {
            must: [ { match_all: {} } ],
          },
        },
        size: 100,
      },
    }, context);

    return client.search(esRequest)
    .then(resp => {
      const flatHits = map(resp.hits.hits, (hit, i) => {
        return Object.assign(flattenHit(hit), { _rowId: i });
      });

      const columnNames = keys(flatHits[0]);

      return getESFieldTypes(args.index, columnNames)
      .then(typedFields => {
        return {
          type: 'datatable',
          columns: map(typedFields, (type, name) => ({ name, type })),
          rows: flatHits,
        };
      });


    });
  },
});
