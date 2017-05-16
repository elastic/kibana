import handleESError from '../../../lib/handle_es_error';

export function registerValueSuggestions(server) {
  server.route({
    path: '/api/kibana/suggestions/values/{index}',
    method: ['POST'],
    handler: function (req, reply) {
      const { index } = req.params;
      const { field, query } = req.payload;

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const include = query ? `.*${query}.*` : undefined;
      const body = getBody({ field, include });

      return callWithRequest(req, 'search', { index, body })
      .then((res) => {
        const suggestions = res.aggregations.suggestions.buckets.map(bucket => bucket.key);
        return reply(suggestions);
      })
      .catch(error => reply(handleESError(error)));
    }
  });
}

function getBody(terms) {
  return {
    aggs: {
      suggestions: { terms }
    }
  };
}
