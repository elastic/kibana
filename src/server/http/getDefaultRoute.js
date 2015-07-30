'use strict';

let _ = require('lodash');

module.exports = _.once(function (kbnServer) {
  // user configured default route
  let defaultConfig = kbnServer.config.get('server.defaultRoute');
  if (defaultConfig) return defaultConfig;

  // redirect to the single app
  if (kbnServer.uiExports.apps.length === 1) {
    return `/app/${kbnServer.uiExports.apps[0].id}`;
  }

  return '/apps';
});
