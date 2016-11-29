import _ from 'lodash';

module.exports = _.once(function (kbnServer) {
  const { uiExports, config } = kbnServer;
  return `${config.get('server.basePath')}${config.get('server.defaultRoute')}`;
});
