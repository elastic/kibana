module.exports = function (kbnServer, server, config) {
  var _ = require('lodash');

  server.decorate('reply', 'renderApp', function (app, view) {

    var optimizeStatus = kbnServer.status.get('optimize');
    switch (optimizeStatus && optimizeStatus.state) {
    case 'yellow':
      return this(`
        <html>
          <head><meta http-equiv="refresh" content="1"></head>
          <body>${optimizeStatus.message}</body>
        </html>
      `).code(503);

    case 'red':
      return this(`
        <html><body>${optimizeStatus.message}</body></html>
      `).code(500);

    }

    var payload = {
      app: app,
      appCount: kbnServer.uiExports.apps.length,
      version: kbnServer.version,
      buildSha: _.get(kbnServer, 'build.sha', '@@buildSha'),
      buildNumber: _.get(kbnServer, 'build.number', '@@buildNum'),
      cacheBust: _.get(kbnServer, 'build.number', ''),
      kbnIndex: config.get('kibana.index'),
      esShardTimeout: config.get('elasticsearch.shardTimeout')
    };

    return this.view(view || 'uiApp', {
      app: app,
      cacheBust: payload.cacheBust,
      kibanaPayload: payload
    });
  });
};
