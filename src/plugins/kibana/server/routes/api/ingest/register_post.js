import Boom from 'boom';
import _ from 'lodash';
import ingestConfigSchema from '../../../lib/schemas/resources/ingest_config_schema';
import handleESError from '../../../lib/handle_es_error';
import createMappingsFromPatternFields from '../../../lib/create_mappings_from_pattern_fields';
import initDefaultFieldProps from '../../../lib/init_default_field_props';
import {ingestToPattern, patternToIngest} from '../../../lib/convert_pattern_and_ingest_name';
import { keysToCamelCaseShallow } from '../../../lib/case_conversion';

function patternRollback(rootError, indexPatternId, boundCallWithRequest) {
  const deleteParams = {
    index: '.kibana',
    type: 'index-pattern',
    id: indexPatternId
  };

  return boundCallWithRequest('delete', deleteParams)
  .then(
    () => {
      throw rootError;
    },
    (patternDeletionError) => {
      throw new Error(
        `index-pattern ${indexPatternId} created successfully but index template or pipeline
                creation failed. Failed to rollback index-pattern creation, must delete manually.
                ${patternDeletionError.toString()}
                ${rootError.toString()}`
      );
    }
  );
}

function templateRollback(rootError, templateName, boundCallWithRequest) {
  const deleteParams = {
    name: templateName
  };

  return boundCallWithRequest('indices.deleteTemplate', deleteParams)
    .then(
      () => {
        throw rootError;
      },
      (templateDeletionError) => {
        throw new Error(
          `index template ${templateName} created successfully but pipeline
                creation failed. Failed to rollback template creation, must delete manually.
                ${templateDeletionError.toString()}
                ${rootError.toString()}`
        );
      }
    );
}


module.exports = function registerPost(server) {
  server.route({
    path: '/api/kibana/ingest',
    method: 'POST',
    config: {
      validate: {
        payload: ingestConfigSchema
      }
    },
    handler: function (req, reply) {
      const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, req);
      const requestDocument = _.cloneDeep(req.payload);
      const indexPattern = keysToCamelCaseShallow(requestDocument.index_pattern);
      const indexPatternId = indexPattern.id;
      const ingestConfigName = patternToIngest(indexPatternId);
      delete indexPattern.id;

      const mappings = createMappingsFromPatternFields(indexPattern.fields);
      indexPattern.fields = initDefaultFieldProps(indexPattern.fields);

      indexPattern.fields = JSON.stringify(indexPattern.fields);
      indexPattern.fieldFormatMap = JSON.stringify(indexPattern.fieldFormatMap);

      const pipeline = {
        processors: requestDocument.pipeline
      };

      // Set up call with request params
      const patternCreateParams = {
        index: '.kibana',
        type: 'index-pattern',
        id: indexPatternId,
        body: indexPattern
      };

      const templateParams = {
        order: 0,
        create: true,
        name: ingestConfigName,
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

      const pipelineParams = {
        path: `_ingest/pipeline/${ingestConfigName}`,
        method: 'PUT',
        body: pipeline
      };


      return boundCallWithRequest('indices.exists', {index: indexPatternId})
      .then((matchingIndices) => {
        if (matchingIndices) {
          throw Boom.conflict('Cannot create an index pattern via this API if existing indices already match the pattern');
        }

        return boundCallWithRequest('create', patternCreateParams)
        .then(() => {
          return boundCallWithRequest('indices.putTemplate', templateParams)
          .catch((templateError) => {return patternRollback(templateError, indexPatternId, boundCallWithRequest);});
        })
        .then(() => {
          return boundCallWithRequest('transport.request', pipelineParams)
          .catch((pipelineError) => {return templateRollback(pipelineError, ingestConfigName, boundCallWithRequest);})
          .catch((templateRollbackError) => {return patternRollback(templateRollbackError, indexPatternId, boundCallWithRequest);});
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
