const Boom = require('boom');
const _ = require('lodash');
const indexPatternSchema = require('../../../lib/schemas/resources/index_pattern_schema');
const handleESError = require('../../../lib/handle_es_error');
const addMappingInfoToPatternFields = require('../../../lib/add_mapping_info_to_pattern_fields');
const { convertToCamelCase } = require('../../../lib/case_conversion');

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
      const requestDocument = _.cloneDeep(req.payload);
      const included = requestDocument.included;
      const indexPatternId = requestDocument.data.id;
      const indexPattern = convertToCamelCase(requestDocument.data.attributes);
      const templateResource = _.isEmpty(included) ? null : included[0];

      if (!_.isEmpty(templateResource)) {
        addMappingInfoToPatternFields(indexPattern, templateResource.attributes);
        indexPattern.template_id = templateResource.id;
      }
      indexPattern.fields = JSON.stringify(indexPattern.fields);
      indexPattern.fieldFormatMap = JSON.stringify(indexPattern.fieldFormatMap);

      const patternCreateParams = {
        index: '.kibana',
        type: 'index-pattern',
        id: indexPatternId,
        body: indexPattern
      };

      callWithRequest(req, 'create', patternCreateParams)
      .then((patternResponse) => {
        if (_.isEmpty(included)) {
          return patternResponse;
        }

        return callWithRequest(req, 'indices.exists', {index: indexPattern.title})
        .then((matchingIndices) => {
          if (matchingIndices) {
            throw Boom.conflict('Cannot create an index template if existing indices already match index pattern');
          }

          const templateParams = {
            order: templateResource.attributes.order,
            create: true,
            name: templateResource.id,
            body: _.omit(templateResource.attributes, 'order')
          };

          return callWithRequest(req, 'indices.putTemplate', templateParams);
        })
        .catch((templateError) => {
          const deleteParams = {
            index: '.kibana',
            type: 'index-pattern',
            id: indexPatternId
          };
          return callWithRequest(req, 'delete', deleteParams)
          .then(() => {
            throw templateError;
          }, () => {
            throw new Error(`index-pattern ${indexPatternId} created successfully but index template
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
