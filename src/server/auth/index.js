let _ = require('lodash');
let Boom = require('boom');
let Joi = require('joi');
let hapiAuthCookie = require('hapi-auth-cookie');
let strategyMap = require('./lib/authStrategyMap');

module.exports = (kbnServer, server, config) => {
  if (!config.get('auth.enabled')) return;
  let name = config.get('auth.strategy');
  let strategy = strategyMap.get(name);
  if (strategy == null) throw new Error(`There is no registered authentication strategy with the name "${name}".`);
  if (_.isFunction(strategy.init)) strategy.init(server);

  server.register(hapiAuthCookie, (error) => {
    if (error != null) throw error;

    let options = {
      cookie: 'sid',
      password: config.get('auth.encryptionKey'),
      ttl: config.get('auth.sessionTimeout'),
      clearInvalid: true,
      isHttpOnly: false,
      keepAlive: true,
      isSecure: true,
      redirectTo: '/login'
    };

    if (_.isFunction(strategy.validate)) {
      options.validateFunc = (request, session, callback) => strategy.validate(request, session).nodeify(callback);
    }

    server.auth.strategy('session', 'cookie', 'required', options);
  });

  server.route({
    method: 'POST',
    path: '/login',
    handler(request, reply) {
      strategy.authenticate(request, request.payload.username, request.payload.password)
      .then((credentials) => {
        request.auth.session.set(credentials);
        reply({
          'statusCode': 200,
          'message': 'Success'
        });
      }, (error) => {
        request.auth.session.clear();
        reply(Boom.unauthorized(error));
      });
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
    handler(request, reply) {
      request.auth.session.clear();
      return reply.redirect('/');
    }
  });
};