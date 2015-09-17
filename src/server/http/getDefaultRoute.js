let _ = require('lodash');

module.exports = _.once(function (kbnServer) {
  // user configured default route
  let defaultConfig = kbnServer.config.get('server.defaultRoute');
  if (defaultConfig) return defaultConfig;

  // redirect to the single app
  let apps = kbnServer.uiExports.apps.toArray();
  return '/app/kibana';
});
