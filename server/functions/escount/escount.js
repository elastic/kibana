import { buildESRequest } from '../esdocs/lib/build_es_request';

export default {
  name: 'escount',
  context: {
    types: ['filter'],
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
      default: '"-_index:.kibana"',
    },
  },
  type: 'number',
  help: 'Query elasticsearch and get back raw documents.',
  fn: (context, args, handlers) => {
    context.and = context.and
      .concat([{ // q
        type: 'luceneQueryString',
        query: args.q,
      }]);

    const esRequest = buildESRequest({
      index: args.index,
      body: {
        query: {
          bool: {
            must: [ { match_all: {} } ],
          },
        },
        size: 0,
      },
    }, context);

    return handlers
      .elasticsearchClient('search', esRequest)
      .then(resp => {
        return resp.hits.total;
      });
  },
};
