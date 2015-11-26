const Boom = require('boom');
const Joi = require('joi');
const indexPatternSchema = require('../../../lib/schemas/index_pattern_schema');
const _ = require('lodash');
const handleESError = require('../../../lib/handle_es_error');

module.exports = function registerPut(server) {
  server.route({
    path: '/api/kibana/index_patterns/{id}',
    method: 'PUT',
    handler: function (req, reply) {
      if (_.isEmpty(req.payload)) {
        return reply(Boom.badRequest('Payload required'));
      }
      if (req.payload.title && req.payload.title !== req.params.id) {
        return reply(Boom.badRequest('Updates to title not supported'));
      }
      const validation = Joi.validate(req.payload, indexPatternSchema.put);
      if (validation.error) {
        return reply(Boom.badRequest(validation.error));
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
        reply(Boom.badRequest('Mappings cannot be updated'));
      } else {
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
            reply(pattern);
          }, function (error) {
            reply(handleESError(error));
          });
      }
    }
  });
};
