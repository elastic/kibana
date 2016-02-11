import _ from 'lodash';
import { processResponse } from '../../../lib/ingest_simulate';
import simulateRequestSchema from '../../../lib/schemas/simulate_request_schema';
import ingestSimulateApiToEsConverter from '../../../lib/converters/ingest_simulate_api_to_es_converter';

module.exports = function registerSimulate(server) {
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
      const body = ingestSimulateApiToEsConverter(simulateApiDocument);

      return boundCallWithRequest('transport.request', {
        path: '_ingest/pipeline/_simulate',
        query: { verbose: true },
        method: 'POST',
        body: body
      })
      .then(_.partial(processResponse, simulateApiDocument))
      .then(reply);
    }
  });
};
