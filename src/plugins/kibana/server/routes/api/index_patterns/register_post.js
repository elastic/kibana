const Boom = require('boom');
const _ = require('lodash');
const {templateToPattern, patternToTemplate} = require('../../../lib/convert_pattern_and_template_name');
const indexPatternSchema = require('../../../lib/schemas/index_pattern_schema');
const handleESError = require('../../../lib/handle_es_error');

module.exports = function registerPost(server) {
  server.route({
    path: '/api/kibana/index_patterns',
    method: 'POST',
    config: {
      validate: {
        payload: indexPatternSchema.post
      }
    },
    handler: function (req, reply) {
      if (_.isEmpty(req.payload)) {
        return reply(Boom.badRequest('Payload required'));
      }

      const callWithRequest = server.plugins.elasticsearch.callWithRequest;
      const indexPattern = _.cloneDeep(req.payload);
      const isWildcard = _.contains(indexPattern.title, '*');
      const mappings = _(req.payload.fields)
      .indexBy('name')
      .mapValues(value => value.mapping)
      .omit(_.isUndefined)
      .value();

      indexPattern.fields = JSON.stringify(_.map(indexPattern.fields, (field) => {
        return _.omit(field, 'mapping');
      }));

      const patternCreateParams = {
        index: '.kibana',
        type: 'index-pattern',
        id: indexPattern.title,
        body: indexPattern
      };

      callWithRequest(req, 'create', patternCreateParams)
      .then((patternResponse) => {
        if (!isWildcard || _.isEmpty(mappings)) {
          return patternResponse;
        }

        return callWithRequest(req, 'indices.exists', {index: indexPattern.title})
        .then((matchingIndices) => {
          if (matchingIndices) {
            throw Boom.conflict('Cannot create an index template if existing indices already match index pattern');
          }

          const templateParams = {
            order: 0,
            create: true,
            name: patternToTemplate(indexPattern.title),
            body: {
              template: indexPattern.title,
              mappings: {
                _default_: {
                  properties: mappings
                }
              }
            }
          };

          return callWithRequest(req, 'indices.putTemplate', templateParams);
        })
        .catch((templateError) => {
          const deleteParams = {
            index: '.kibana',
            type: 'index-pattern',
            id: indexPattern.title
          };
          return callWithRequest(req, 'delete', deleteParams)
          .then(() => {
            throw templateError;
          }, () => {
            throw new Error(`index-pattern ${indexPattern.title} created successfully but index template
            creation failed. Failed to rollback index-pattern creation, must delete manually.`);
          });
        });
      })
      .then(() => {
        reply('success').statusCode = 201;
      })
      .catch(function (error) {
        reply(handleESError(error));
      });
    }
  });
};
