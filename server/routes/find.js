module.exports = function (server) {
  server.route({
    method: 'GET',
    path: '/api/rework/find',
    handler: function (request, reply) {

      return server.uiSettings().getAll(request).then((uiSettings) => {
        const config = server.config();
        const callWithRequest = server.plugins.elasticsearch.callWithRequest;

        // name: name of dashboard

        const params = request.query;
        const esQuery = params.name ? {
          bool: {
            should: [
              {match: {'workpad.name': params.name}},
              {wildcard: {'workpad.name': `*${params.name}`}},
              {wildcard: {'workpad.name': `${params.name}*`}},
              {wildcard: {'workpad.name': `*${params.name}*`}},
              {match: {'workpad.name.keyword': params.name}},
              {wildcard: {'workpad.name.keyword': `*${params.name}`}},
              {wildcard: {'workpad.name.keyword': `${params.name}*`}},
              {wildcard: {'workpad.name.keyword': `*${params.name}*`}},
            ]
          }
        } : {match_all:{}};

        const body = {
          index: config.get('kibana.index'),
          type: server.plugins.rework.kibanaType,
          body: {
            query: esQuery,
            _source: ['workpad.name', '@timestamp'],
            sort: [{
              '@timestamp': {
                order: 'desc'
              }
            }],
            // TODO: Don't you hate this? Kibana did this, drives people nuts. Welcome to nut town. Nutball.
            size: 10000
          }
        };

        callWithRequest(request, 'search', body).then(function (resp) {
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
