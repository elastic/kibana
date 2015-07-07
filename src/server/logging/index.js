var fromNode = require('bluebird').fromNode;

module.exports = function (kbnServer, server, config) {
  if (!config.get('logging.kbnLogger')) return;

  return fromNode(function (cb) {
    server.register({
      register: require('good'),
      options: {
        opsInterval: 5000,
        reporters: [
          {
            reporter: require('./LogReporter'),
            config: config.get('logging.kbnLoggerConfig'),
            events: config.get('logging.kbnLoggerEvents'),
          }
        ]
      }
    }, cb);
  });
};
