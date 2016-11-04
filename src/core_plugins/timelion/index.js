
let path = require('path');

module.exports = function (kibana) {
  let mainFile = 'plugins/timelion/app';

  let ownDescriptor = Object.getOwnPropertyDescriptor(kibana, 'autoload');
  let protoDescriptor = Object.getOwnPropertyDescriptor(kibana.constructor.prototype, 'autoload');
  let descriptor = ownDescriptor || protoDescriptor || {};
  if (descriptor.get) {
    // the autoload list has been replaced with a getter that complains about
    // improper access, bypass that getter by seeing if it is defined
    mainFile = 'plugins/timelion/app_with_autoload';
  }

  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch'],
    uiExports: {
      app: {
        title: 'Timelion',
        order: -1000,
        description: 'Time series expressions for everything',
        icon: 'plugins/timelion/icon.svg',
        main: mainFile,
        injectVars: function (server, options) {
          let config = server.config();
          return {
            kbnIndex: config.get('kibana.index'),
            esShardTimeout: config.get('elasticsearch.shardTimeout'),
            esApiVersion: config.get('elasticsearch.apiVersion')
          };
        }
      },
      hacks: [
        'plugins/timelion/lib/panel_registry',
        'plugins/timelion/panels/timechart/timechart'
      ],
      visTypes: [
        'plugins/timelion/vis'
      ],
      modules: {
        flot$: {
          path: path.resolve(__dirname, 'bower_components/flot/jquery.flot'),
          imports: 'jquery'
        },
        flotTime$: {
          path: path.resolve(__dirname, 'bower_components/flot/jquery.flot.time'),
          imports: 'flot'
        },
        /*flotCanvas$: {
          path: path.resolve(__dirname, 'bower_components/flot/jquery.flot.canvas'),
          imports: 'flot'
        },*/
        flotSymbol$: {
          path: path.resolve(__dirname, 'bower_components/flot/jquery.flot.symbol'),
          imports: 'flot'
        },
        angularSortableView$: {
          path: path.resolve(__dirname, 'bower_components/angular-sortable-view/src/angular-sortable-view.js')
        },
        flotCrosshair$: {
          path: path.resolve(__dirname, 'bower_components/flot/jquery.flot.crosshair'),
          imports: 'flot'
        },
        flotSelection$: {
          path: path.resolve(__dirname, 'bower_components/flot/jquery.flot.selection'),
          imports: 'flot'
        },
        flotStack$: {
          path: path.resolve(__dirname, 'bower_components/flot/jquery.flot.stack'),
          imports: 'flot'
        },
        flotAxisLabels$: {
          path: path.resolve(__dirname, 'vendor_components/flot/jquery.flot.axislabels'),
          imports: 'flot'
        }
      }
    },
    init: require('./init.js'),
  });
};
