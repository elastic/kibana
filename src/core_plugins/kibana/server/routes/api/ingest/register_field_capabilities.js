import _ from 'lodash';
import handleESError from '../../../lib/handle_es_error';

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
            return _.pick(value, ['searchable', 'aggregatable']);
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
