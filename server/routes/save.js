module.exports = function (server) {
  server.route({
    method: 'POST',
    path: '/api/rework/save',
    handler: function (request, reply) {

      return server.uiSettings().getAll(request).then((uiSettings) => {
        const config = server.config();
        const callWithRequest = server.plugins.elasticsearch.callWithRequest;

        const payload = request.payload;

        const body = {
          index: config.get('kibana.index'),
          type: server.plugins.rework.kibanaType,
          id: payload.workpad.id,
          body: payload
        };

        console.log(payload);

        callWithRequest(request, 'index', body).then(function (resp) {
          console.log(resp);
          reply({
            ok: true,
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
