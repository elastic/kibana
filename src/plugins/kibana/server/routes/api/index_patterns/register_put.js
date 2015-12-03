const Boom = require('boom');
const indexPatternSchema = require('../../../lib/schemas/index_pattern_schema');
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
      if (req.payload.title && req.payload.title !== req.params.id) {
        return reply(Boom.badRequest('Updates to title not supported'));
      }

      const callWithRequest = server.plugins.elasticsearch.callWithRequest;
      const indexPattern = _.cloneDeep(req.payload);
      const mappings = _(req.payload.fields)
      .indexBy('name')
      .mapValues(value => value.mapping)
      .omit(_.isUndefined)
      .value();

      indexPattern.fields = JSON.stringify(_.map(indexPattern.fields, (field) => {
        return _.omit(field, 'mapping');
      }));

      if (!_.isEmpty(mappings)) {
        return reply(Boom.badRequest('Mappings cannot be updated'));
      }

      const params = {
        index: '.kibana',
        type: 'index-pattern',
        id: req.params.id,
        body: {
          doc: indexPattern
        }
      };
      callWithRequest(req, 'update', params)
      .then(function (pattern) {
        return reply(pattern);
      }, function (error) {
        return reply(handleESError(error));
      });
    }
  });
};
