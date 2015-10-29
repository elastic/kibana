module.exports = function (kibana) {

  return new kibana.Plugin({

    init: function (server, options) {

      server.route({
        path: '/api/index-patterns',
        method: 'GET',
        handler: function (req, reply) {
          let client = server.plugins.elasticsearch.client;

          client.search({
            index: '.kibana',
            type: 'index-pattern',
            body: {
              query: {
                match_all: {}
              }
            }
          }).then(function (patterns) {
            reply(patterns);
          });
        }
      });

      server.route({
        path: '/api/index-patterns/{id}',
        method: 'GET',
        handler: function (req, reply) {
          let client = server.plugins.elasticsearch.client;

          client.get({
            index: '.kibana',
            type: 'index-pattern',
            id: req.params.id
          }).then(function (pattern) {
            reply(pattern);
          });
        }
      });

      server.route({
        path: '/api/index-patterns',
        method: 'POST',
        handler: function (req, reply) {
          let client = server.plugins.elasticsearch.client;

          client.create({
            index: '.kibana',
            type: 'index-pattern',
            id: req.payload.title,
            body: req.payload
          }).then(function (pattern) {
            reply(pattern);
          });
        }
      });

      server.route({
        path: '/api/index-patterns/{id}',
        method: 'DELETE',
        handler: function (req, reply) {
          let client = server.plugins.elasticsearch.client;

          client.delete({
            index: '.kibana',
            type: 'index-pattern',
            id: req.params.id
          }).then(function (pattern) {
            reply(pattern);
          });
        }
      });

    }
  });
};
