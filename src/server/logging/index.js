import { fromNode } from 'bluebird';
import evenBetter from 'even-better';
import loggingConfiguration from './configuration';

export function setupLogging(server, config) {
  return fromNode((cb) => {
    server.register({
      register: evenBetter,
      options: loggingConfiguration(config)
    }, cb);
  });
}

export function loggingMixin(kbnServer, server, config) {
  return setupLogging(server, config);
}
