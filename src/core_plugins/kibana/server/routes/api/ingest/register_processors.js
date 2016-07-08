import _ from 'lodash';
import handleESError from '../../../lib/handle_es_error';
import handleResponse from '../../../lib/process_es_ingest_processors_response';
import { keysToCamelCaseShallow, keysToSnakeCaseShallow } from '../../../../common/lib/case_conversion';

export function registerProcessors(server) {
  server.route({
    path: '/api/kibana/ingest/processors',
    method: 'GET',
    handler: function (request, reply) {
      const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, request);

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
