module.exports = function (server) {
  server.route({
    method: 'GET',
    path: '/api/rework/get/{id}',
    handler: function (request, reply) {

      return server.uiSettings().getAll(request).then((uiSettings) => {
        const config = server.config();
        const callWithRequest = server.plugins.elasticsearch.callWithRequest;
        const body = {
          index: config.get('kibana.index'),
          type: server.plugins.rework.kibanaType,
          id: request.params.id
        };

        callWithRequest(request, 'get', body).then(function (resp) {
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
