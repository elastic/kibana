import { buildESRequest } from './esdocs/lib/build_es_request';

export const escount = () => ({
  name: 'escount',
  type: 'number',
  help: 'Query elasticsearch for a count of the number of hits matching a query',
  context: {
    types: ['filter'],
  },
  args: {
    index: {
      types: ['string', 'null'],
      default: '_all',
      help: 'Specify an index pattern. Eg "logstash-*"',
    },
    _: {
      types: ['string'],
      aliases: ['query', 'q'],
      help: 'A Lucene query string',
      default: '"-_index:.kibana"',
    },
  },
  fn: (context, args, handlers) => {
    context.and = context.and.concat([
      {
        type: 'luceneQueryString',
        query: args._,
      },
    ]);

    const esRequest = buildESRequest(
      {
        index: args.index,
        body: {
          query: {
            bool: {
              must: [{ match_all: {} }],
            },
          },
        },
      },
      context
    );

    return handlers.elasticsearchClient('count', esRequest).then(resp => resp.count);
  },
});
