import Boom from 'boom';
import _ from 'lodash';
import ingestConfigSchema from '../../../lib/schemas/resources/ingest_config_schema';
import handleESError from '../../../lib/handle_es_error';
import createMappingsFromPatternFields from '../../../lib/create_mappings_from_pattern_fields';
import initDefaultFieldProps from '../../../lib/init_default_field_props';
import {ingestToPattern, patternToIngest} from '../../../../common/lib/convert_pattern_and_ingest_name';
import { keysToCamelCaseShallow } from '../../../../common/lib/case_conversion';

export function registerPost(server) {
  const kibanaIndex = server.config().get('kibana.index');

  function patternRollback(rootError, indexPatternId, boundCallWithRequest) {
    const deleteParams = {
      index: kibanaIndex,
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
            `index-pattern ${indexPatternId} created successfully but index template
                creation failed. Failed to rollback index-pattern creation, must delete manually.
                ${patternDeletionError.toString()}
                ${rootError.toString()}`
          );
        }
      );
  }

  server.route({
    path: '/api/kibana/ingest',
    method: 'POST',
    config: {
      validate: {
        payload: ingestConfigSchema
      }
    },
    handler: async function (req, reply) {
      const uiSettings = server.uiSettings();
      const metaFields = await uiSettings.get('metaFields');
      const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, req);
      const requestDocument = _.cloneDeep(req.payload);
      const indexPattern = keysToCamelCaseShallow(requestDocument.index_pattern);
      const indexPatternId = indexPattern.id;
      const ingestConfigName = patternToIngest(indexPatternId);
      delete indexPattern.id;

      const mappings = createMappingsFromPatternFields(indexPattern.fields);
      const indexPatternMetaFields = _.map(metaFields, name => ({name}));

      indexPattern.fields = initDefaultFieldProps(indexPattern.fields.concat(indexPatternMetaFields));
      indexPattern.fields = JSON.stringify(indexPattern.fields);
      indexPattern.fieldFormatMap = JSON.stringify(indexPattern.fieldFormatMap);

      // Set up call with request params
      const patternCreateParams = {
        index: kibanaIndex,
        type: 'index-pattern',
        id: indexPatternId,
        body: indexPattern
      };

      const templateParams = {
        order: 1,
        create: true,
        name: ingestConfigName,
        body: {
          template: indexPatternId,
          mappings: {
            _default_: {
              properties: mappings
            }
          }
        }
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
