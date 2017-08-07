import handleESError from '../../../lib/handle_es_error';

export function registerValueSuggestions(server) {
  server.route({
    path: '/api/kibana/suggestions/values/{index}',
    method: ['POST'],
    handler: async function (req, reply) {
      const uiSettings = req.getUiSettingsService();
      const { index } = req.params;
      const { field, query } = req.payload;
      const terminateAfter = await uiSettings.get('filterEditor:suggestions:terminateAfter');

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const body = getBody({ field, query, terminateAfter });

      try {
        const response = await callWithRequest(req, 'search', { index, body });
        const suggestions = response.aggregations.suggestions.buckets.map(bucket => bucket.key);
        return reply(suggestions);
      } catch (error) {
        return reply(handleESError(error));
      }
    }
  });
}

function getBody({ field, query, terminateAfter }) {
  const include = query ? `.*${query}.*` : undefined;
  return {
    size: 0,
    terminate_after: terminateAfter,
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
