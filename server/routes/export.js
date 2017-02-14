module.exports = function (server) {
  server.route({
    method: 'GET',
    path: '/api/rework/export/{id?}',
    handler: function (request, reply) {
      return server.uiSettings().getAll(request).then((uiSettings) => {
        const config = server.config();
        const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

        const downloadId = request.params.id;

        const searchQuery = {
          index: config.get('kibana.index'),
          type: server.plugins.rework.kibanaType,
        };

        if (downloadId) {
          searchQuery.body = {
            query: {
              match: {
                '_id': downloadId
              }
            }
          };
        }

        callWithRequest(request, 'search', searchQuery)
        .then(function (resp) {
          const response = reply({
            workpads: resp.hits.hits.map(hit => hit._source)
          });
          response.type('application/json');
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
