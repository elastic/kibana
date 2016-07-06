import _ from 'lodash';
import handleESError from '../../../lib/handle_es_error';
import handleResponse from '../../../lib/process_es_ingest_simulate_response';
import handleError from '../../../lib/process_es_ingest_simulate_error';
import simulateRequestSchema from '../../../lib/schemas/simulate_request_schema';
import ingestSimulateApiKibanaToEsConverter from '../../../lib/converters/ingest_simulate_api_kibana_to_es_converter';
import { keysToCamelCaseShallow, keysToSnakeCaseShallow } from '../../../../common/lib/case_conversion';

export function registerSimulate(server) {
  server.route({
    path: '/api/kibana/ingest/simulate',
    method: 'POST',
    config: {
      validate: {
        payload: simulateRequestSchema
      }
    },
    handler: function (request, reply) {
      const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, request);
      const simulateApiDocument = request.payload;
      const body = ingestSimulateApiKibanaToEsConverter(simulateApiDocument);

      return boundCallWithRequest('transport.request', {
        path: '/_ingest/pipeline/_simulate',
        query: { verbose: true },
        method: 'POST',
        body: body
      })
      .then(handleResponse, handleError)
      .then((processors) => _.map(processors, keysToSnakeCaseShallow))
      .then(reply)
      .catch((error) => {
        reply(handleESError(error));
      });
    }
  });
};
