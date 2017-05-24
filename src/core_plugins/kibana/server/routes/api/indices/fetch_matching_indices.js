import _ from 'lodash';
import handleESError from '../../../lib/handle_es_error';

export function fetchMatchingIndices(server) {
  server.route({
    path: '/api/kibana/fetching_matching_indices',
    method: ['GET'],
    handler: function (req, reply) {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const indexPattern = req.query.index_pattern;
      console.log(req.query)
      console.log('indexPattern', indexPattern)
      // TODO: Request to cat.aliases
      /**
      Call 1: http://localhost:9200/_cat/indices/*m*?h=index&format=json&s=index:asc
      Call 2: http://localhost:9200/_cat/aliases/*l*?h=alias&format=json&s=alias:asc
      From Shaunak Kashyap @ Kibana to Everyone: (03:09 PM)
      For call 1: https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-cat-indices
      For call 2: https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-cat-aliases
      **/


      return callWithRequest(req, 'cat.indices', {
        h: 'index',
        format: 'json',
        s: 'index:asc',
        index: indexPattern,
        ignore: [404],
      })
      .then(
        res => {
          reply(res);
        },
        error => {
          reply(handleESError(error));
        }
      );
    }
  });
}
