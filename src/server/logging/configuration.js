import _ from 'lodash';
import logReporter from './log_reporter';

export default function loggingConfiguration(config) {
  let events = config.get('logging.events');

  if (config.get('logging.silent')) {
    _.defaults(events, {});
  }
  else if (config.get('logging.quiet')) {
    _.defaults(events, {
      log: ['listening', 'error', 'fatal'],
      request: ['error'],
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
      request: ['info', 'warning', 'error', 'fatal'],
      error: '*'
    });
  }

  const options = {
    opsInterval: config.get('ops.interval'),
    requestHeaders: true,
    requestPayload: true,
    reporters: [
      {
        reporter: logReporter,
        config: {
          json: config.get('logging.json'),
          dest: config.get('logging.dest'),
          // I'm adding the default here because if you add another filter
          // using the commandline it will remove authorization. I want users
          // to have to explicitly set --logging.filter.authorization=none to
          // have it show up int he logs.
          filter: _.defaults(config.get('logging.filter'), {
            authorization: 'remove'
          })
        },
        events: _.transform(events, function (filtered, val, key) {
          // provide a string compatible way to remove events
          if (val !== '!') filtered[key] = val;
        }, {})
      }
    ]
  };
  return options;
}
