const Promise = require('bluebird');
const handleESError = require('../../../lib/handle_es_error');
const {ingestToPattern, patternToIngest} = require('../../../lib/convert_pattern_and_ingest_name');

module.exports = function registerDelete(server) {
  server.route({
    path: '/api/kibana/ingest/{id}',
    method: 'DELETE',
    handler: function (req, reply) {
      const callWithRequest = server.plugins.elasticsearch.callWithRequest;
      const deletePatternParams = {
        index: '.kibana',
        type: 'index-pattern',
        id: req.params.id
      };

      Promise.all([
        callWithRequest(req, 'delete', deletePatternParams),
        callWithRequest(req, 'indices.deleteTemplate', {name: patternToIngest(req.params.id), ignore: [404]}),
        callWithRequest(req, 'transport.request', {
          path: `_ingest/pipeline/${patternToIngest(req.params.id)}`,
          method: 'DELETE'
        })
      ])
      .then(
        function (pattern) {
          reply({success: true});
        },
        function (error) {
          reply(handleESError(error));
        }
      );
    }
  });
};
