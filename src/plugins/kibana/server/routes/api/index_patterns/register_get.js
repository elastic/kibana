const _ = require('lodash');
const handleESError = require('../../../lib/handle_es_error');
const getIndexPattern = require('./get_index_pattern');
const getIndexPatterns = require('./get_index_patterns');

module.exports = function registerGet(server) {

  server.route({
    path: '/api/kibana/index_patterns',
    method: 'GET',
    handler: function (req, reply) {
      const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, req);
      const shouldIncludeTemplate = req.query.include === 'template';

      getIndexPatterns(boundCallWithRequest, shouldIncludeTemplate)
      .then(
        function (patterns) {
          reply(patterns);
        },
        function (error) {
          reply(handleESError(error));
        }
      );
    }
  });

  server.route({
    path: '/api/kibana/index_patterns/{id}',
    method: 'GET',
    handler: function (req, reply) {
      const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, req);
      const shouldIncludeTemplate = req.query.include === 'template';
      const patternId = req.params.id;

      getIndexPattern(patternId, boundCallWithRequest, shouldIncludeTemplate)
      .then(
        function (pattern) {
          reply(pattern);
        },
        function (error) {
          reply(handleESError(error));
        }
      );
    }
  });
};
