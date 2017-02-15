import uuid from 'uuid/v4';
import moment from 'moment';

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
          _index: config.get('kibana.index'),
          _type: server.plugins.rework.kibanaType,
        };

        const timestamp = request.payload['@timestamp'] || moment().toISOString();
        const workpads = request.payload.workpads.map(workpad => {
          workpad['@timestamp'] = timestamp;
          workpad.workpad.id = `workpad-${uuid()}`;
          return workpad;
        });

        const body = workpads.reduce((ctx, workpad) => {
          return ctx.concat([
            { index: Object.assign({ _id: workpad.workpad.id }, index) },
            workpad,
          ]);
        }, []);

        return callWithRequest(request, 'bulk', {
          refresh: 'wait_for',
          body,
        })
        .then(function (resp) {
          reply({
            ok: true,
            resp: { workpads },
          });
        })
      })
      .catch(function (resp) {
        reply({
          ok: false,
          resp: resp
        });
      });
    }
  });
};
