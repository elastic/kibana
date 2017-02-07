module.exports = function (server) {
  server.route({
    method: 'GET',
    path: '/api/rework/delete/{id}',
    handler: function (request, reply) {

      return server.uiSettings().getAll(request).then((uiSettings) => {
        const config = server.config();
        const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
        const body = {
          index: config.get('kibana.index'),
          type: server.plugins.rework.kibanaType,
          id: request.params.id,
          refresh: 'wait_for'
        };

        callWithRequest(request, 'delete', body).then(function (resp) {
          reply({
            ok: true,
            resp: resp
          });
        }).catch(function (resp) {
          reply({
            ok: false,
            resp: resp
          });
        });
      });

    }
  });
};
