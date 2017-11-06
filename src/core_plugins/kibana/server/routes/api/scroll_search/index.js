import handleESError from '../../../lib/handle_es_error';

export function scrollSearchApi(server) {
  server.route({
    path: '/api/kibana/legacy_scroll_start',
    method: ['POST'],
    handler: (req, reply) => {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      const { index, size, body } = req.payload;
      const params = {
        index,
        size,
        body,
        scroll: '1m',
        sort: '_doc',
      };
      return callWithRequest(req, 'search', params)
        .then(reply)
        .catch(error => reply(handleESError(error)));
    }
  });

  server.route({
    path: '/api/kibana/legacy_scroll_continue',
    method: ['POST'],
    handler: (req, reply) => {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      const { scrollId } = req.payload;
      return callWithRequest(req, 'scroll', { scrollId, scroll: '1m' })
        .then(reply)
        .catch(error => reply(handleESError(error)));
    }
  });
}
