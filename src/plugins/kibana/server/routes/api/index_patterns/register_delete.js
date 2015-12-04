const Promise = require('bluebird');
const handleESError = require('../../../lib/handle_es_error');
const {templateToPattern, patternToTemplate} = require('../../../lib/convert_pattern_and_template_name');

module.exports = function registerDelete(server) {
  server.route({
    path: '/api/kibana/index_patterns/{id}',
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
        callWithRequest(req, 'indices.deleteTemplate', {name: patternToTemplate(req.params.id)})
        .catch((error) => {
          if (!error.status || error.status !== 404) {
            throw error;
          }
        })
      ])
      .then(function (pattern) {
        reply('success');
      }, function (error) {
        reply(handleESError(error));
      });
    }
  });
};
