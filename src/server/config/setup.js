import Config from './config';
module.exports = function (kbnServer) {
  kbnServer.config = Config.withDefaultSchema(kbnServer.settings);
};
