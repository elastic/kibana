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
    return client.search(buildESRequest({
      index: args.index,
      q: args.q,
      body: {
        _source: args.fields ? args.fields.split(',') : undefined,
      },
    }, context))
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
