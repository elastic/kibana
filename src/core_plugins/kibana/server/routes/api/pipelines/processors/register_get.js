import { chain, get, partial } from 'lodash';
import handleESError from '../../../../lib/handle_es_error';

export default (server) => {
  function handleResponse(response) {
    const nodes = get(response, 'nodes');

    const results = chain(nodes)
      .map('ingest.processors')
      .reduce((result, processors) => {
        return result.concat(processors);
      })
      .map('type')
      .unique()
      .value();

    return results;
  };

  server.route({
    path: '/api/kibana/pipelines/processors',
    method: 'GET',
    handler: function (request, reply) {
      const boundCallWithRequest = partial(server.plugins.elasticsearch.callWithRequest, request);

      return boundCallWithRequest('transport.request', {
        path: '/_nodes/ingest',
        method: 'GET'
      })
      .then(handleResponse)
      .then(reply)
      .catch((error) => {
        reply(handleESError(error));
      });
    }
  });
};
