import _ from 'lodash';

export default _.once(function (kbnServer) {
  const {
    config
  } = kbnServer;
  return `${config.get('server.basePath')}${config.get('server.defaultRoute')}`;
});
