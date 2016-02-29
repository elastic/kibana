import Promise from 'bluebird';
import handleESError from '../../../lib/handle_es_error';
import {templateToPattern, patternToTemplate} from '../../../lib/convert_pattern_and_template_name';

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
        callWithRequest(req, 'indices.deleteTemplate', {name: patternToTemplate(req.params.id), ignore: [404]})
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
