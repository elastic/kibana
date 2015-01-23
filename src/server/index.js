/**
 * Module dependencies.
 */

var app = require('./app');
var http = require('http');
var config = require('./config');
var logger = require('./lib/logger');
var Promise = require('bluebird');
var initialization = require('./lib/serverInitialization');


/**
 * Create HTTP server.
 */

var server = http.createServer(app);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error({ err: error }, 'Port %s requires elevated privileges', app.get('port'));
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error({ err: error }, 'Port %s is already in use', app.get('port'));
      process.exit(1);
      break;
    default:
      logger.error({ err: error });
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var address = server.address();
  logger.info('Listening on %s:%d', address.address, address.port);
}

function start() {
  var port = parseInt(process.env.PORT, 10) || config.port || 3000;
  var host = process.env.HOST || config.host || '127.0.0.1';
  var listen = Promise.promisify(server.listen.bind(server));
  app.set('port', port);
  return listen(port, host);
}

module.exports = {
  server: server,
  start: function (cb) {
    return initialization().then(start).nodeify(cb);
  }
};

if (require.main === module) {
  module.exports.start();
}
