const Boom = require('boom');
const _ = require('lodash');
const {templateToPattern, patternToTemplate} = require('../../../lib/convert_pattern_and_template_name');
const indexPatternSchema = require('../../../lib/schemas/resources/index_pattern_schema');
const handleESError = require('../../../lib/handle_es_error');
const { convertToCamelCase } = require('../../../lib/case_conversion');
const createMappingFromPatternField = require('../../../lib/create_mapping_from_pattern_field');
const castMappingType = require('../../../lib/cast_mapping_type');

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
      const callWithRequest = server.plugins.elasticsearch.callWithRequest;
      const requestDocument = _.cloneDeep(req.payload);
      const indexPatternId = requestDocument.data.id;
      const indexPattern = convertToCamelCase(requestDocument.data.attributes);

      _.forEach(indexPattern.fields, function (field) {
        if (field.scripted) {
          _.defaults(field, {
            indexed: false,
            analyzed: false,
            doc_values: false,
            count: 0
          });
        }
        else {
          _.defaults(field, {
            indexed: true,
            analyzed: false,
            doc_values: true,
            scripted: false,
            count: 0
          });
        }
      });

      const mappings = _(indexPattern.fields)
      .reject('scripted')
      .indexBy('name')
      .mapValues(createMappingFromPatternField)
      .value();

      _.forEach(indexPattern.fields, function (field) {
        field.type = castMappingType(field.type);
      });

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
        return callWithRequest(req, 'indices.exists', {index: indexPatternId})
        .then((matchingIndices) => {
          if (matchingIndices) {
            throw Boom.conflict('Cannot create an index pattern via this API if existing indices already match the pattern');
          }

          const templateParams = {
            order: 0,
            create: true,
            name: patternToTemplate(indexPatternId),
            body: {
              template: indexPatternId,
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
        reply('success').code(201);
      })
      .catch(function (error) {
        reply(handleESError(error));
      });
    }
  });
};
