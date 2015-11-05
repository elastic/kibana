let esErrors = require('elasticsearch').errors;
let Boom = require('Boom');
let _ = require('lodash');

export default function (server) {

  let handleESError = function (error) {
    if (error instanceof esErrors.ConnectionFault ||
      error instanceof esErrors.ServiceUnavailable ||
      error instanceof esErrors.NoConnections ||
      error instanceof esErrors.RequestTimeout) {
      return Boom.serverTimeout();
    } else if (error instanceof esErrors.Conflict) {
      return Boom.conflict();
    } else if (error instanceof esErrors[403]) {
      return Boom.forbidden();
    } else if (error instanceof esErrors.NotFound) {
      return Boom.notFound();
    } else if (error instanceof esErrors.BadRequest) {
      return Boom.badRequest();
    } else {
      return error;
    }
  };

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
      }, function (error) {
        reply(handleESError(error));
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
      }, function (error) {
        reply(handleESError(error));
      });
    }
  });

  server.route({
    path: '/api/index-patterns',
    method: 'POST',
    handler: function (req, reply) {
      let client = server.plugins.elasticsearch.client;
      let isWildcard = _.contains(req.payload.title, '*');

      client.create({
        index: '.kibana',
        type: 'index-pattern',
        id: req.payload.title,
        body: req.payload
      }).then((patternResponse) => {
        if (!isWildcard) {
          return patternResponse;
        }
        else {
          return client.indices.putTemplate({
            order: 0,
            create: true,
            name: 'kibana-' + req.payload.title,
            body: {
              template: req.payload.title
            }
          });
        }
      }).then((response) => {
        reply('success').statusCode = 201;
      }).catch(function (error) {
        reply(handleESError(error));
      });
    }
  });

  server.route({
    path: '/api/index-patterns/{id}',
    method: 'PUT',
    handler: function (req, reply) {
      let client = server.plugins.elasticsearch.client;

      client.update({
        index: '.kibana',
        type: 'index-pattern',
        id: req.params.id,
        body: {
          doc: req.payload
        }
      }).then(function (pattern) {
        reply(pattern);
      }, function (error) {
        reply(handleESError(error));
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
      }, function (error) {
        reply(handleESError(error));
      });
    }
  });
}
