'use strict';

let _ = require('lodash');
let fromNode = require('bluebird').fromNode;

module.exports = function (kbnServer, server, config) {
  return fromNode(function (cb) {
    let events = config.get('logging.events');

    if (config.get('logging.quiet')) {
      _.defaults(events, {
        log: ['error', 'fatal'],
        error: '*'
      });
    }

    if (config.get('logging.verbose')) {
      _.defaults(events, {
        log: ['info', 'warning', 'error', 'fatal'],
        response: '*',
        error: '*'
      });
    }

    server.register({
      register: require('good'),
      options: {
        opsInterval: 5000,
        reporters: [
          {
            reporter: require('./LogReporter'),
            config: {
              json: config.get('logging.json'),
              dest: config.get('logging.dest')
            },
            events: events,
          }
        ]
      }
    }, cb);
  });
};
