module.exports = (server) => {

  function authHandler(fn) {
    return function (req, reply) {
      return fn(req, reply)
        .then(reply)
        .catch(function (err) {
          if (err.status === 401) {
            return reply(err.body)
              .header('WWW-Authenticate', 'Basic realm="Authorization Required"')
              .code(401);
          }
          reply(err);
        });
    };
  }

  server.expose('authHandler', authHandler);

};
