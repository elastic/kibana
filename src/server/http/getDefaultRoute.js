let _ = require('lodash');

module.exports = _.once(function (kbnServer) {
  const { uiExports, config } = kbnServer;
  // user configured default route
  let defaultConfig = config.get('server.defaultRoute');
  if (defaultConfig) return defaultConfig;

  return `${config.get('server.basePath')}/app/kibana`;
});
