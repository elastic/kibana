module.exports = function (kbnServer) {
  let Config = require('./config');
  kbnServer.config = Config.withDefaultSchema(kbnServer.settings);
};
