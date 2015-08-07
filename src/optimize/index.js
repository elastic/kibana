module.exports = function (kbnServer, server, config) {
  if (!config.get('optimize.enabled')) return;

  let lazy = config.get('optimize.lazy');
  let strategy = lazy ? require('./lazy/lazy') : require('./dist/dist');
  return kbnServer.mixin(strategy);
};
