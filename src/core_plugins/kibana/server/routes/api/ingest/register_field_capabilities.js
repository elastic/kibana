import _ from 'lodash';

import handleESError from '../../../lib/handle_es_error';
import { shouldReadFieldFromDocValues } from './should_read_field_from_doc_values';

export function registerFieldCapabilities(server) {
  server.route({
    path: '/api/kibana/{indices}/field_capabilities',
    method: ['GET'],
    handler: function (req, reply) {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const indices = req.params.indices || '';

      return callWithRequest(req, 'fieldStats', {
        fields: '*',
        level: 'cluster',
        index: indices,
        allowNoIndices: false
      })
      .then(
        (res) => {
          const fields = _.get(res, 'indices._all.fields', {});
          const fieldsFilteredValues = _.mapValues(fields, (value) => {
            return {
              searchable: value.searchable,
              aggregatable: value.aggregatable,
              readFromDocValues: shouldReadFieldFromDocValues(value.aggregatable, value.type)
            };
          });

          const retVal = { fields: fieldsFilteredValues };
          if (res._shards && res._shards.failed) {
            retVal.shard_failure_response = res;
          }

          reply(retVal);
        },
        (error) => {
          reply(handleESError(error));
        }
      );
    }
  });
}
