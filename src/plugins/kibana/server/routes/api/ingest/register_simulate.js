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
      const client = server.plugins.elasticsearch.client;
      const simulateApiDocument = request.payload;
      const body = ingestSimulateApiToEsConverter(simulateApiDocument);

      client.transport.request({
        path: '_ingest/pipeline/_simulate',
        query: { verbose: true },
        method: 'POST',
        body: body
      },
      function (err, resp) {
        reply(processResponse(simulateApiDocument, err, resp));
      });
    }
  });
};
