import Boom from 'boom';
import _ from 'lodash';
import indexPatternSchema from '../../../lib/schemas/resources/index_pattern_schema';
import handleESError from '../../../lib/handle_es_error';
import createMappingsFromPatternFields from '../../../lib/create_mappings_from_pattern_fields';
import initDefaultFieldProps from '../../../lib/init_default_field_props';
import {templateToPattern, patternToTemplate} from '../../../lib/convert_pattern_and_template_name';
import { keysToCamelCaseShallow } from '../../../lib/case_conversion';

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
      const kibanaIndex = server.config().get('kibana.index');
      const callWithRequest = server.plugins.elasticsearch.callWithRequest;
      const requestDocument = _.cloneDeep(req.payload);
      const indexPatternId = requestDocument.id;
      const indexPattern = keysToCamelCaseShallow(requestDocument);
      delete indexPattern.id;

      const mappings = createMappingsFromPatternFields(indexPattern.fields);
      indexPattern.fields = initDefaultFieldProps(indexPattern.fields);

      indexPattern.fields = JSON.stringify(indexPattern.fields);
      indexPattern.fieldFormatMap = JSON.stringify(indexPattern.fieldFormatMap);

      return callWithRequest(req, 'indices.exists', {index: indexPatternId})
      .then((matchingIndices) => {
        if (matchingIndices) {
          throw Boom.conflict('Cannot create an index pattern via this API if existing indices already match the pattern');
        }

        const patternCreateParams = {
          index: kibanaIndex,
          type: 'index-pattern',
          id: indexPatternId,
          body: indexPattern
        };

        return callWithRequest(req, 'create', patternCreateParams)
        .then((patternResponse) => {
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
                        type: 'text',
                        fields: {
                          raw: {type: 'keyword', ignore_above: 256}
                        }
                      }
                    }
                  }],
                  properties: mappings
                }
              }
            }
          };

          return callWithRequest(req, 'indices.putTemplate', templateParams)
          .catch((templateError) => {
            const deleteParams = {
              index: kibanaIndex,
              type: 'index-pattern',
              id: indexPatternId
            };

            return callWithRequest(req, 'delete', deleteParams)
            .then(() => {
              throw templateError;
            }, (patternDeletionError) => {
              throw new Error(
                `index-pattern ${indexPatternId} created successfully but index template
                creation failed. Failed to rollback index-pattern creation, must delete manually.
                ${patternDeletionError.toString()}
                ${templateError.toString()}`
              );
            });
          });
        });
      })
      .then(
        function () {
          reply().code(204);
        },
        function (error) {
          reply(handleESError(error));
        }
      );
    }
  });
};
