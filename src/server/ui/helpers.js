module.exports = function (kibana, server, config) {
  var _ = require('lodash');

  server.decorate('reply', 'renderApp', function (app) {
    var payload = {
      app: app,
      appCount: kibana.uiExports.appCount,
      version: kibana.version,
      buildSha: _.get(kibana, 'build.sha', '@@buildSha'),
      buildNumber: _.get(kibana, 'build.number', '@@buildNum'),
      cacheBust: _.get(kibana, 'build.number', ''),
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
