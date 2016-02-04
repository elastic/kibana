const _ = require('lodash');
const buildRequest = require('../../../lib/ingest_build_request');
const processResponse = require('../../../lib/ingest_process_response');

module.exports = function registerSimulate(server) {
  server.route({
    path: '/api/kibana/ingest/simulate',
    method: 'POST',
    handler: function (request, reply) {
      const client = server.plugins.elasticsearch.client;
      const pipeline = request.payload;
      const body = buildRequest(pipeline);

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
