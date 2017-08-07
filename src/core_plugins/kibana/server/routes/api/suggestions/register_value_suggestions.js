import handleESError from '../../../lib/handle_es_error';

export function registerValueSuggestions(server) {
  server.route({
    path: '/api/kibana/suggestions/values/{index}',
    method: ['POST'],
    handler: async function (req, reply) {
      const { index } = req.params;
      const { field, query } = req.payload;
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const body = getBody({ field, query });
      try {
        const response = await callWithRequest(req, 'search', { index, body });
        const suggestions = response.aggregations.suggestions.buckets.map(bucket => bucket.key);
        reply(suggestions);
      } catch (error) {
        reply(handleESError(error));
      }
    }
  });
}

function getBody({ field, query }) {
  const include = query ? `.*${query}.*` : undefined;
  return {
    size: 0,
    terminate_after: 100000,
    aggs: {
      suggestions: {
        terms: {
          field,
          include,
          execution_hint: 'map'
        }
      }
    }
  };
}
