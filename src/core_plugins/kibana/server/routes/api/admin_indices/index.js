import handleESError from '../../../lib/handle_es_error';

export function adminIndicesApi(server) {
  server.route({
    path: '/api/kibana/legacy_admin_indices',
    method: ['GET'],
    handler: (req, reply) => {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      const params = {
        index: req.query.index,
        format: 'json',
        ignore: 404,
      };
      return callWithRequest(req, 'cat.indices', params)
        .then(reply)
        .catch(error => reply(handleESError(error)));
    }
  });

  server.route({
    path: '/api/kibana/legacy_admin_aliases',
    method: ['GET'],
    handler: (req, reply) => {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      const params = {
        index: req.query.index,
        allowNoIndices: true,
        ignore: 404,
      };
      return callWithRequest(req, 'indices.getAlias', params)
        .then(reply)
        .catch(error => reply(handleESError(error)));
    }
  });

  server.route({
    path: '/api/kibana/legacy_admin_index_template',
    method: ['GET'],
    handler: (req, reply) => {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('admin');
      const params = {
        name: req.query.name,
        ignore: 404,
      };
      return callWithRequest(req, 'indices.getTemplate', params)
        .then(reply)
        .catch(error => reply(handleESError(error)));
    }
  });
}
