const _ = require('lodash');
import { buildRequest, processResponse } from '../../../lib/ingest_simulate';
import processorTypes from '../../../../common/ingest_processor_types';
import simulateRequestSchema from '../../../lib/schemas/simulate_request_schema';

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
      const pipeline = request.payload;
      const body = buildRequest(processorTypes, pipeline);

      client.transport.request({
        path: '_ingest/pipeline/_simulate',
        query: { verbose: true },
        method: 'POST',
        body: body
      },
      function (err, resp) {
        reply(processResponse(pipeline, err, resp));
      });
    }
  });
};
