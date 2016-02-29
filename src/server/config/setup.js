module.exports = function (kbnServer) {
  let Config = require('./config');
  let schema = require('./schema')();

  kbnServer.config = new Config(schema, kbnServer.settings || {});
};
