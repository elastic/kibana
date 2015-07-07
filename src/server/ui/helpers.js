module.exports = function (kbnServer, server, config) {
  var _ = require('lodash');

  server.decorate('reply', 'renderApp', function (app) {
    var payload = {
      app: app,
      angularModules: app.getModules().angular,
      appCount: kbnServer.uiExports.apps.length,
      version: kbnServer.version,
      buildSha: _.get(kbnServer, 'build.sha', '@@buildSha'),
      buildNumber: _.get(kbnServer, 'build.number', '@@buildNum'),
      cacheBust: _.get(kbnServer, 'build.number', ''),
      kbnIndex: config.get('kibana.index'),
      esShardTimeout: config.get('elasticsearch.shardTimeout')
    };

    return this.view('bootstrap', {
      app: app,
      cacheBust: payload.cacheBust,
      kibanaPayload: payload
    });
  });
};
