module.exports = function (server) {
  require('./handlers/chain_runner.js');
  //var config = server.config();
  server.route({
    method: 'POST',
    path: '/timelion/sheet',
    handler: require('./routes/sheet.js')
  });

  server.route({
    method: 'GET',
    path: '/timelion/functions',
    handler: require('./routes/functions.js')
  });

  server.route({
    method: 'GET',
    path: '/timelion/validate/es',
    handler: require('./routes/validate_es.js')
  });
};