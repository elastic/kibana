import { partial } from 'lodash';
import handleESError from '../../../../lib/handle_es_error';

export default (server) => {
  server.route({
    path: '/api/kibana/pipelines/pipeline/{id}',
    method: 'DELETE',
    handler: function (request, reply) {
      const boundCallWithRequest = partial(server.plugins.elasticsearch.callWithRequest, request);

      //TODO: Need to clean up the sample input strings in kibana index

      return boundCallWithRequest('transport.request', {
        path: `/_ingest/pipeline/${request.params.id}`,
        method: 'DELETE'
      })
      .then(reply)
      .catch((error) => {
        reply(handleESError(error));
      });
    }
  });
};
