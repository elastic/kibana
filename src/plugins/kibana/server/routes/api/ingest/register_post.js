const Boom = require('boom');
const _ = require('lodash');
const {templateToPattern, patternToTemplate} = require('../../../lib/convert_pattern_and_template_name');
const indexPatternSchema = require('../../../lib/schemas/resources/index_pattern_schema');
const handleESError = require('../../../lib/handle_es_error');
const { convertToCamelCase } = require('../../../lib/case_conversion');
const createMappingsFromPatternFields = require('../../../lib/create_mappings_from_pattern_fields');
const initDefaultFieldProps = require('../../../lib/init_default_field_props');

module.exports = function registerPost(server) {
  server.route({
    path: '/api/kibana/ingest',
    method: 'POST',
    config: {
      validate: {
        payload: indexPatternSchema
      }
    },
    handler: function (req, reply) {
      const callWithRequest = server.plugins.elasticsearch.callWithRequest;
      const requestDocument = _.cloneDeep(req.payload);
      const indexPatternId = requestDocument.id;
      const indexPattern = convertToCamelCase(requestDocument);
      delete indexPattern.id;

      const mappings = createMappingsFromPatternFields(indexPattern.fields);
      indexPattern.fields = initDefaultFieldProps(indexPattern.fields);

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
                  dynamic_templates: [{
                    string_fields: {
                      match: '*',
                      match_mapping_type: 'string',
                      mapping: {
                        type: 'string',
                        index: 'analyzed',
                        omit_norms: true,
                        fielddata: {format: 'disabled'},
                        fields: {
                          raw: {type: 'string', index: 'not_analyzed', doc_values: true, ignore_above: 256}
                        }
                      }
                    }
                  }],
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
        reply().code(204);
      })
      .catch(function (error) {
        reply(handleESError(error));
      });
    }
  });
};
