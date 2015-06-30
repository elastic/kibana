module.exports = function (kibana) {
  var healthCheck = require('./lib/health_check');
  var exposeClient = require('./lib/expose_client');
  var createProxy = require('./lib/create_proxy');

  return new kibana.Plugin({
    init: function (server, options) {
      var config = server.config();

      // Expose the client to the server
      exposeClient(server);


      createProxy(server, 'GET', '/elasticsearch/{paths*}');
      createProxy(server, 'POST', '/elasticsearch/_mget');
      createProxy(server, 'POST', '/elasticsearch/_msearch');

      function noBulkCheck(request, reply) {
        if (/\/_bulk/.test(request.path)) {
          return reply({
            error: 'You can not send _bulk requests to this interface.'
          }).code(400).takeover();
        }
        return reply.continue();
      }

      createProxy(
        server,
        ['PUT', 'POST', 'DELETE'],
        '/elasticsearch/' + config.get('kibana.index') + '/{paths*}',
        {
          prefix: '/' + config.get('kibana.index'),
          config: { pre: [ noBulkCheck ] }
        }
      );

      // Set up the health check service and start it.
      healthCheck(this, server).start();
    }
  });

};
