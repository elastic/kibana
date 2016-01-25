export default function defineKibanaServerRoutes(server) {
  var client = server.plugins.elasticsearch.client;

  server.route({
    path: '/api/kibana/simulate',
    method: 'POST',
    handler: function(request, reply) {
      var client = server.plugins.elasticsearch.client;

      client.transport.request({
        path: '_ingest/pipeline/_simulate',
        query: { verbose: true },
        method: 'POST',
        body: request.payload
      }, function(err, resp) {
        //use boom to make a pretty err response
        //if (err) reply(Boom.wrap(err));
        if (err) {
          reply();
        } else {
          reply(resp);
        }
      });
    }
  });
}
