var _ = require('lodash');
var Boom = require('boom');
var Joi = require('joi');
var hapiAuthCookie = require('hapi-auth-cookie');
var kibana = require('../../');

module.exports = new kibana.Plugin({
  init: function (server, options) {
    var config = server.config();
    var isValid = require('./lib/htpasswd')(config.get('kibana.server.auth.htpasswd')); // TODO: Clean up how this is imported

    server.register(hapiAuthCookie, function (error) {
      if (error != null) return; // TODO: Handle this error

      server.auth.strategy('session', 'cookie', 'required', {
        cookie: 'sid',
        isHttpOnly: false,
        clearInvalid: true,
        keepAlive: true,
        redirectTo: '/login',
        password: config.get('kibana.server.auth.encryptionKey'),
        isSecure: false, // TODO: If https is enabled, set to true
        ttl: config.get('kibana.server.auth.sessionTimeout'),
        validateFunc: function (request, session, callback) {
          return callback(null, isValid(session.username, session.password), session);
        }
      });
    });

    server.route({
      method: 'GET',
      path: '/login',
      handler: function (request, reply) {
        reply.file('/login/index.html');
      },
      config: {
        auth: false
      }
    });

    server.route({
      method: 'POST',
      path: '/login',
      handler: function (request, reply) {
        if (isValid(request.payload.username, request.payload.password)) {
          request.auth.session.set(_.pick(request.payload, 'username', 'password'));
          reply('Success.');
        } else {
          request.auth.session.clear();
          reply(Boom.unauthorized('Bad username and/or password.'));
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