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
  return {
    size: 0,
    timeout: '1s',
    query: {
      query_string: {
        default_field: field,
        query: `${getEscapedQuery(query)}*`,
        analyze_wildcard: true
      }
    },
    aggs: {
      suggestions: {
        terms: { field }
      }
    }
  };
}

function getEscapedQuery(query = '') {
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_reserved_characters
  return query
    .replace(/\\/g, '\\\\')
    .replace(/\+/g, '\\+')
    .replace(/\-/g, '\\-')
    .replace(/\=/g, '\\=')
    .replace(/\&/g, '\\&')
    .replace(/\|/g, '\\|')
    .replace(/\>/g, '\\>')
    .replace(/\</g, '\\<')
    .replace(/\!/g, '\\!')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\[/g, '\\[')
    .replace(/\[/g, '\\]')
    .replace(/\^/g, '\\^')
    .replace(/\"/g, '\\"')
    .replace(/\~/g, '\\~')
    .replace(/\*/g, '\\*')
    .replace(/\?/g, '\\?')
    .replace(/\:/g, '\\:')
    .replace(/\//g, '\\/');
}
