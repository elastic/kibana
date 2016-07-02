import handleESError from '../../../lib/handle_es_error';
import getMappings from '../../../lib/get_mappings';
import getIndicesForIntervalPattern from '../../../lib/get_indices_for_interval_pattern';
import createPatternFieldsFromMappings from '../../../lib/create_pattern_fields_from_mappings';
import _ from 'lodash';
import isWildcardPattern from '../../../lib/is_wildcard_pattern';
import Promise from 'bluebird';

module.exports = function registerFields(server) {
  server.route({
    path: '/api/kibana/ingest/{id}/_fields',
    method: 'GET',
    handler: function (req, reply) {
      const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, req);
      const pattern = req.params.id;

      let indicesPromise = Promise.resolve(pattern);
      if (!isWildcardPattern(pattern)) {
        indicesPromise = getIndicesForIntervalPattern(pattern, boundCallWithRequest)
        .then(indices => indices.matches);
      }

      return indicesPromise
      .then(indices => getMappings(indices, boundCallWithRequest))
      .then(createPatternFieldsFromMappings)
      .then(
        function (fields) {
          reply(fields);
        },
        function (error) {
          reply(handleESError(error));
        }
      );
    }
  });
};
