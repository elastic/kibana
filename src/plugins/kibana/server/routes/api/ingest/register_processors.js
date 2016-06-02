import _ from 'lodash';
import handleESError from '../../../lib/handle_es_error';
import { keysToCamelCaseShallow, keysToSnakeCaseShallow } from '../../../../common/lib/case_conversion';

export function handleResponse(response) {
  const nodes = _.get(response, 'nodes');

  const results = _.chain(nodes)
    .map('ingest.processors')
    .reduce((result, processors) => {
      return result.concat(processors);
    })
    .map('type')
    .unique()
    .value();

  return results;
};

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
