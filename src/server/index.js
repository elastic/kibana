/**
 * Module dependencies.
 */

var app = require('./app');
var fs = require('fs');
var config = require('./config');
var logger = require('./lib/logger');
var Promise = require('bluebird');
var initialization = require('./lib/serverInitialization');
var key, cert;
try {
  key = fs.readFileSync(config.kibana.ssl_key_file, 'utf8');
  cert = fs.readFileSync(config.kibana.ssl_cert_file, 'utf8');
} catch (err) {
  if (err.code === 'ENOENT') {
    logger.fatal('Failed to read %s', err.path);
    process.exit(1);
  }
}


/**
 * Create HTTPS/HTTP server.
 */
var server;
if (key && cert) {
  server = require('https').createServer({
    key: key,
    cert: cert
  }, app);
} else {
  server = require('http').createServer(app);
}
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
  var port = config.port || 3000;
  var host = config.host || '127.0.0.1';
  var listen = Promise.promisify(server.listen.bind(server));
  app.set('port', port);
  return listen(port, host);
}

module.exports = {
  server: server,
  start: function (cb) {
    return initialization()
      .then(start)
      .then(function () {
        cb && cb();
      }, function (err) {
        logger.error({ err: err });
        if (cb) {
          cb(err);
        } else {
          process.exit();
        }
      });
  }
};

if (require.main === module) {
  module.exports.start();
}
