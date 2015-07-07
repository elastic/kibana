module.exports = function (kbnServer) {
  var UiExports = require('./UiExports');

  kbnServer.uiExports = new UiExports(kbnServer);
};
