let _ = require('lodash');
let fromNode = require('bluebird').fromNode;

module.exports = function (kbnServer, server, config) {
  return fromNode(function (cb) {
    let events = config.get('logging.events');

    if (config.get('logging.silent')) {
      _.defaults(events, {});
    }
    else if (config.get('logging.quiet')) {
      _.defaults(events, {
        log: ['listening', 'error', 'fatal'],
        error: '*'
      });
    }
    else if (config.get('logging.verbose')) {
      _.defaults(events, {
        log: '*',
        ops: '*',
        request: '*',
        response: '*',
        error: '*'
      });
    }
    else {
      _.defaults(events, {
        log: ['info', 'warning', 'error', 'fatal'],
        response: config.get('logging.json') ? '*' : '!',
        error: '*'
      });
    }

    server.register({
      register: require('good'),
      options: {
        opsInterval: 5000,
        requestHeaders: true,
        requestPayload: true,
        reporters: [
          {
            reporter: require('./LogReporter'),
            config: {
              json: config.get('logging.json'),
              dest: config.get('logging.dest'),
              // I'm adding the default here because if you add another filter
              // using the commandline it will remove authorization. I want users
              // to have to explicitly set --logging.filter.authorization=none or
              // --logging.filter.cookie=none to have it show up in the logs.
              filter: _.defaults(config.get('logging.filter'), {
                authorization: 'remove',
                cookie: 'remove'
              })
            },
            events: _.transform(events, function (filtered, val, key) {
              // provide a string compatible way to remove events
              if (val !== '!') filtered[key] = val;
            }, {})
          }
        ]
      }
    }, cb);
  });
};
