import uuid from 'uuid/v4';

module.exports = function (server) {
  server.route({
    method: 'POST',
    path: '/api/rework/import/',
    handler: function (request, reply) {
      return server.uiSettings().getAll(request)
      .then((uiSettings) => {
        const config = server.config();
        const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

        const index = {
          index: {
            _index: config.get('kibana.index'),
            _type: server.plugins.rework.kibanaType,
          },
        };
        const workpads = request.payload.workpads.map(workpad => {
          workpad.workpad.id = `workpad-${uuid()}`;
          return workpad;
        });

        const body = workpads.reduce((ctx, workpad) => {
          return ctx.concat([index, workpad]);
        }, []);

        callWithRequest(request, 'bulk', { body })
        .then(function (resp) {
          reply({
            ok: true,
            resp: { workpads },
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
