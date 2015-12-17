const _ = require('lodash');
const handleESError = require('../../../lib/handle_es_error');
const getIndexPattern = require('./get_index_pattern');
const Boom = require('boom');

module.exports = function registerDelete(server) {
  server.route({
    path: '/api/kibana/index_patterns/{id}',
    method: 'DELETE',
    handler: function (req, reply) {
      const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, req);
      const shouldIncludeTemplate = req.query.include === 'template';
      const patternId = req.params.id;

      const deletePatternParams = {
        index: '.kibana',
        type: 'index-pattern',
        id: patternId
      };

      let result;
      if (shouldIncludeTemplate) {
        result = getIndexPattern(patternId, boundCallWithRequest)
        .then((patternResource) => {
          const templateId = _.get(patternResource, 'data.relationships.template.data.id');
          if (!templateId) {
            return;
          }

          return boundCallWithRequest(
            'indices.deleteTemplate',
            {name: templateId}
          )
          .catch((error) => {
            if (!error.status || error.status !== 404) {
              throw error;
            }
          });
        })
        .then(() => {
          return boundCallWithRequest('delete', deletePatternParams);
        });
      }
      else {
        result = boundCallWithRequest('delete', deletePatternParams);
      }

      result.then(
        function () {
          reply('success');
        },
        function (error) {
          reply(handleESError(error));
        }
      );
    }
  });
};
