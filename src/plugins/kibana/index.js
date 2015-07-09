module.exports = function (kibana) {
  var jq = ['$=jquery'];
  var ng = jq.concat('angular');

  return new kibana.Plugin({

    config: function (Joi) {
      return Joi.object({
        index: Joi.string().default('.kibana'),
        buildNum: Joi.string().default('@@buildNum')
      }).default();
    },

    uiExports: {
      app: {
        title: 'Kibana',
        description: 'the kibana you know and love',
        icon: 'plugins/kibana/settings/sections/about/barcode.svg',
        main: 'plugins/kibana/kibana',
        uses: [
          'visTypes',
          'spyModes'
        ],
        constants: function (server, options) {
          return {
            defaultAppId: options.defaultAppId
          };
        }
      },

      modules: {
        'chrome$': 'chrome/chrome',
        'lodash': 'utils/lodash-mixins/index',
        'errors': 'components/errors',
        'modules': 'components/modules',
        'routes': 'components/routes/index',

        // bower_components
        'angular': ['bower_components/angular/angular', jq, 'window.angular'],

        // angular deps
        'angular-bindonce': ['bower_components/angular-bindonce/bindonce', ng],
        'angular-bootstrap': ['bower_components/angular-bootstrap/ui-bootstrap-tpls', ng],
        'angular-elastic': ['bower_components/angular-elastic/elastic', ng],
        'angular-route': ['bower_components/angular-route/angular-route', ng],
        'ng-clip': ['bower_components/ng-clip/src/ngClip', ng.concat('zeroclipboard')],
        'elasticsearch': ['meta-modules/elasticsearch'],
        'elasticsearch-src': {
          path: 'bower_components/elasticsearch/elasticsearch.angular.min',
          parse: false
        },

        // ace editor
        'ace': {
          path: 'bower_components/ace-builds/src-noconflict/ace',
          parse: false,
          exports: 'ace'
        },
        'angular-ui-ace': ['bower_components/angular-ui-ace/ui-ace', ng.concat('ace', 'aceJson=ace-json')],
        'ace-json': ['bower_components/ace-builds/src-noconflict/mode-json', 'ace'],
        'd3': ['bower_components/d3/d3'],
        'faker': ['bower_components/Faker/faker'],
        'file_saver': ['bower_components/FileSaver/FileSaver', null, 'saveAs'],
        'gridster': ['bower_components/gridster/dist/jquery.gridster', 'jquery,gs=gridster-styles'],
        'gridster-styles': ['bower_components/gridster/dist/jquery.gridster.css'],
        'jquery':{
          path: 'bower_components/jquery/dist/jquery',
          expose: 'jQuery'
        },
        'leaflet': ['bower_components/leaflet/dist/leaflet', 'ls=leaflet-styles'],
        'leaflet-styles': ['bower_components/leaflet-draw/dist/leaflet.draw.css'],
        'leaflet-heat': ['bower_components/Leaflet.heat/dist/leaflet-heat', 'leaflet'],
        'leaflet-draw': ['bower_components/leaflet-draw/dist/leaflet.draw', 'leaflet,lds=leaflet-draw-styles'],
        'leaflet-draw-styles': ['bower_components/leaflet/dist/leaflet.css'],
        'lodash_src': ['bower_components/lodash/lodash'],
        'moment': ['bower_components/moment/moment'],
        'zeroclipboard': ['bower_components/zeroclipboard/dist/ZeroClipboard'],
        'marked': ['bower_components/marked/lib/marked'],
        'numeral': ['bower_components/numeral/numeral']
      }
    }
  });

};
