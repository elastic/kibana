const Boom = require('boom');
const indexPatternSchema = require('../../../lib/schemas/resources/index_pattern_schema');
const _ = require('lodash');
const handleESError = require('../../../lib/handle_es_error');

module.exports = function registerPut(server) {
  server.route({
    path: '/api/kibana/index_patterns/{id}',
    method: 'PUT',
    config: {
      validate: {
        payload: indexPatternSchema.put
      }
    },
    handler: function (req, reply) {
      if (_.isEmpty(req.payload)) {
        return reply(Boom.badRequest('Payload required'));
      }

      const callWithRequest = server.plugins.elasticsearch.callWithRequest;
      const indexPatternResource = _.cloneDeep(req.payload);
      const indexPatternId = indexPatternResource.data.id;
      const indexPattern = indexPatternResource.data.attributes;
      const included = indexPatternResource.included;
      indexPattern.fields = JSON.stringify(indexPattern.fields);

      if (!_.isEmpty(included)) {
        return reply(Boom.badRequest('PUT does not support included resource updates'));
      }

      const params = {
        index: '.kibana',
        type: 'index-pattern',
        id: indexPatternId,
        body: {
          doc: indexPattern
        }
      };
      callWithRequest(req, 'update', params)
      .then(function () {
        return reply('success');
      }, function (error) {
        return reply(handleESError(error));
      });
    }
  });
};
