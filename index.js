
var path = require('path');

module.exports = function (kibana) {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch'],
    uiExports: {
      app: {
        title: 'Timelion',
        description: 'Time series expressions for everything',
        icon: 'plugins/timelion/icon.svg',
        main: 'plugins/timelion/app',
        injectVars: function (server, options) {
          var config = server.config();
          return {
            kbnIndex: config.get('kibana.index'),
            esShardTimeout: config.get('elasticsearch.shardTimeout'),
            esApiVersion: config.get('elasticsearch.apiVersion')
          };
        }
      },
      modules: {
        flot$: {
          path: path.resolve(__dirname, 'bower_components/flot/jquery.flot'),
          imports: 'jquery'
        },
        flotTime$: {
          path: path.resolve(__dirname, 'bower_components/flot/jquery.flot.time'),
          imports: 'flot'
        },
        flotCanvas$: {
          path: path.resolve(__dirname, 'bower_components/flot/jquery.flot.canvas'),
          imports: 'flot'
        },
        flotCrosshair$: {
          path: path.resolve(__dirname, 'bower_components/flot/jquery.flot.crosshair'),
          imports: 'flot'
        }
      }
    },
    init: require('./init.js'),
  });
};
