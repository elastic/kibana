var Promise = require('bluebird');
var good = require('good');
var path = require('path');
var join = path.join;
var Console = require('./good_reporters/console');


module.exports = function (server) {
  return new Promise(function (resolve, reject) {
    var reporters = [];
    var config = server.config();

    // If we are not quite then add the console logger
    var filters = {};
    if (!config.get('logging.quiet')) {
      if (config.get('logging.console.ops') != null) filters.ops = config.get('logging.console.ops');
      if (config.get('logging.console.log') != null) filters.log = config.get('logging.console.log');
      if (config.get('logging.console.response') != null) filters.response = config.get('logging.console.response');
      if (config.get('logging.console.error') != null) filters.error = config.get('logging.console.error');
    }
    reporters.push({ reporter: Console, args: [filters, { json: config.get('logging.console.json') } ] });
    server.register({
      register: good,
      options: {
        opsInterval: 5000,
        logRequestHeaders: true,
        logResponsePayload: true,
        reporters: reporters
      }
    }, function (err) {
      if (err) return reject(err);
      resolve(server);
    });
  });
};
