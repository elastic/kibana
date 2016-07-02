import handleESError from '../../../lib/handle_es_error';
import getIndicesForIntervalPattern from '../../../lib/get_indices_for_interval_pattern';
import _ from 'lodash';

// An endpoint specifically for use by the UI for creating time interval based index patterns.
// The interval pattern UI needs a list of matching indices and indices that are close to matching
// to help the user craft their date pattern.
export function registerIndices(server) {
  server.route({
    path: '/api/kibana/ingest/{id}/_indices',
    method: 'GET',
    handler: function (req, reply) {
      const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, req);

      getIndicesForIntervalPattern(req.params.id, boundCallWithRequest)
      .then(
        function (indices) {
          reply(indices);
        },
        function (error) {
          reply(handleESError(error));
        }
      );
    }
  });
};
