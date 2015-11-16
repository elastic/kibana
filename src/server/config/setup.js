module.exports = function (kbnServer) {
  let Config = require('./Config');
  let schema = require('./schema')();

  kbnServer.config = new Config(schema, kbnServer.settings || {});
};
