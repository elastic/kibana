import handleESError from '../../../lib/handle_es_error';

export function registerValues(server) {
  server.route({
    path: '/api/kibana/values/{index}',
    method: ['POST'],
    handler: async function (req, reply) {
      const { index } = req.params;
      const { field } = req.payload;
      const { query } = req.payload;

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const body = getBody(field, query);
      let fieldList = [];
      try {

        const response = await callWithRequest(req, 'search', { index, body });
        const buckets = response.aggregations.aggResults.buckets;
        for (let i = 0; i < buckets.length; i < i++) {
          const currentField = buckets[i].key;
          if (typeof (currentField) === 'object') {
            // its an array
            fieldList = fieldList.concat(currentField);
          } else {
            fieldList.push(currentField);
          }
        }
        const uniqueValues = Array.from(new Set(fieldList));
        reply(uniqueValues);
      } catch (error) {
        reply(handleESError(error));
      }
    }
  });
}

function getBody(field, { query }) {
  const aggregationSize = 10000;
  return {
    size: 0,
    timeout: '60s',
    aggs: {
      aggResults: {
        terms: {
          field: field,
          size: aggregationSize
        }
      }
    },
    query: query
  };
}

// function getEscapedQuery(query = '') {
//   // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html#_standard_operators
//   return query.replace(/[.?+*|{}[\]()"\\#@&<>~]/g, (match) => `\\${match}`);
// }
