import _ from 'lodash';
import elasticsearch from 'elasticsearch';
import Fn from '../../../common/functions/fn.js';
import flattenHit from './lib/flatten_hit';
import { buildESRequest } from './lib/build_es_request';

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
  help: 'Query elasticsearch and get back raw documents, flattened into a datatable. ' +
        'Most of the time you probably want esaggs(). Much like the csv() function this ' +
        'will only look at the first hit for determining columns. You would be wise to give ' +
        'all of your documents the same schema',
  fn: (context, args) => {
    return client.search(buildESRequest({
      index: args.index,
      q: args.q,
      // fields: args.fields.split(',').map((str) => str.trim()),
    }, context))
    .then(resp => {
      const flatHits = _.map(resp.hits.hits, (hit, i) => {
        return Object.assign(flattenHit(hit), { _rowId: i });
      });
      const columns = _.map(flatHits[0], (fieldVal, fieldName) => {
        return { name: fieldName, type: typeof fieldVal };
      });

      return {
        type: 'datatable',
        columns: columns,
        rows: flatHits,
      };
    });
  },
});
