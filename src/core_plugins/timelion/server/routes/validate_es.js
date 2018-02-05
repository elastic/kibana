import _ from 'lodash';

export default function (server) {
  server.route({
    method: 'GET',
    path: '/api/timelion/validate/es',
    handler: async function (request, reply) {
      const uiSettings = await request.getUiSettingsService().getAll();

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

      const timefield = uiSettings['timelion:es.timefield'];

      const body = {
        index: uiSettings['es.default_index'],
        body: {
          aggs: {
            maxAgg: {
              max: {
                field: timefield
              }
            },
            minAgg: {
              min: {
                field: timefield
              }
            }
          },
          size: 0
        }
      };

      let resp = {};
      try {
        resp = await callWithRequest(request, 'search', body);
      } catch (errResp) {
        resp = errResp;
      }

      if (_.has(resp, 'aggregations.maxAgg.value') && _.has(resp, 'aggregations.minAgg.value')) {
        reply({
          ok: true,
          field: timefield,
          min: _.get(resp, 'aggregations.minAgg.value'),
          max: _.get(resp, 'aggregations.maxAgg.value')
        });
        return;
      }

      reply({
        ok: false,
        resp: resp
      });
    }
  });
}
