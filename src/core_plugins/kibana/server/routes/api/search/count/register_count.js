import _ from 'lodash';
import handleESError from '../../../../lib/handle_es_error';

export default function registerCount(server) {
  server.route({
    path: '/api/kibana/{id}/_count',
    method: ['POST', 'GET'],
    handler: function (req, reply) {
      const boundCallWithRequest = _.partial(server.plugins.elasticsearch.callWithRequest, req);

      boundCallWithRequest('count', {
        allowNoIndices: false,
        index: req.params.id
      })
      .then(
        function (res) {
          reply({count: res.count});
        },
        function (error) {
          reply(handleESError(error));
        }
      );
    }
  });
}
