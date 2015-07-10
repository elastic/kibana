var fs = require('fs');
var _ = require('lodash');
var Promise = require('bluebird');
var Boom = require('boom');
var Joi = require('joi');
var hapiAuthCookie = require('hapi-auth-cookie');
var kibana = require('../../');

module.exports = new kibana.Plugin({
  require: ['elasticsearch'],
  init: function (server, options) {
    var config = server.config();
    if (!config.get('kibana.server.auth.enabled')) return;

    var strategy = require('./lib/strategy/htpasswd')(server); // TODO: Clean up how this is imported

    server.register(hapiAuthCookie, function (error) {
      if (error != null) return; // TODO: Handle this error

      var options = {
        cookie: 'sid',
        password: config.get('kibana.server.auth.encryptionKey'),
        ttl: config.get('kibana.server.auth.sessionTimeout'),
        clearInvalid: true,
        keepAlive: true,
        isSecure: false, // TODO: Switch to true
        isHttpOnly: false,
        redirectTo: '/login'
      };

      if (strategy.validate) {
        options.validateFunc = function (request, session, callback) {
          return strategy.validate(request, session).nodeify(callback);
        };
      }

      server.auth.strategy('session', 'cookie', 'required', options);
    });

    server.route({
      method: 'GET',
      path: '/login',
      handler: function (request, reply) {
        reply.file('src/server/plugins/auth/public/login.html');
      },
      config: {
        auth: false
      }
    });

    server.route({
      method: 'POST',
      path: '/login',
      handler: function (request, reply) {
        strategy.authenticate(request, request.payload.username, request.payload.password)
        .then(onSuccessfulLogin, onUnsuccessfulLogin);

        function onSuccessfulLogin(credentials) {
          request.auth.session.set(credentials);
          reply({
            "statusCode": 200,
            "message": "Success"
          });
        }

        function onUnsuccessfulLogin() {
          request.auth.session.clear();
          var response = Boom.unauthorized('Bad username and/or password.');
          reply(response);
        }
      },
      config: {
        auth: false,
        validate: {
          payload: {
            username: Joi.string().required(),
            password: Joi.string().required()
          }
        }
      }
    });

    server.route({
      method: 'GET',
      path: '/logout',
      handler: function (request, reply) {
        request.auth.session.clear();
        return reply.redirect('/');
      }
    });
  }
});