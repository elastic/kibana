import { fromNode } from 'bluebird';
import evenBetter from 'even-better';
import loggingConfiguration from './configuration';

export default function (kbnServer, server, config) {
  // prevent relying on kbnServer so this can be used with other hapi servers
  kbnServer = null;

  return fromNode(function (cb) {
    server.register({
      register: evenBetter,
      options: loggingConfiguration(config)
    }, cb);
  });
};
