require.config({
  baseUrl: './',
  paths: {
    kibana: 'index',
    // special utils
    routes: 'utils/routes/index',
    errors: 'components/errors',
    modules: 'utils/modules',
    lodash: 'utils/_mixins',

    // bower_components
    'angular-bindonce': 'bower_components/angular-bindonce/bindonce',
    'angular-bootstrap': 'bower_components/angular-bootstrap/ui-bootstrap-tpls',
    'angular-elastic': 'bower_components/angular-elastic/elastic',
    'angular-route': 'bower_components/angular-route/angular-route',
    'angular-selectize': 'bower_components/angular-selectize.js/angular-selectize',
    'angular-ui-ace': 'bower_components/angular-ui-ace/ui-ace',
    ace: 'bower_components/ace-builds/src-noconflict/ace',
    angular: 'bower_components/angular/angular',
    async: 'bower_components/async/lib/async',
    bower_components: 'bower_components',
    css: 'bower_components/require-css/css',
    d3: 'bower_components/d3/d3',
    elasticsearch: 'bower_components/elasticsearch/elasticsearch.angular',
    faker: 'bower_components/Faker/faker',
    file_saver: 'bower_components/FileSaver/FileSaver',
    gridster: 'bower_components/gridster/dist/jquery.gridster',
    inflection: 'bower_components/inflection/lib/inflection',
    jquery: 'bower_components/jquery/dist/jquery',
    leaflet: 'bower_components/leaflet/dist/leaflet',
    lodash_src: 'bower_components/lodash/dist/lodash',
    'lodash-deep': 'bower_components/lodash-deep/lodash-deep',
    microplugin: 'bower_components/microplugin/src/microplugin',
    moment: 'bower_components/moment/moment',
    'ng-clip': 'bower_components/ng-clip/src/ngClip',
    selectize: 'bower_components/selectize/dist/js/selectize',
    sifter: 'bower_components/sifter/sifter',
    text: 'bower_components/requirejs-text/text',
    zeroclipboard: 'bower_components/zeroclipboard/dist/ZeroClipboard'
  },
  shim: {
    angular: {
      deps: ['jquery'],
      exports: 'angular'
    },
    gridster: ['jquery', 'css!bower_components/gridster/dist/jquery.gridster.css'],
    'angular-route': ['angular'],
    'elasticsearch': ['angular'],
    'angular-bootstrap': ['angular'],
    'angular-bindonce': ['angular'],
    'angular-selectize': ['angular', 'selectize'],
    'angular-ui-ace': ['angular', 'ace'],
    'ng-clip': ['angular', 'zeroclipboard'],
    file_saver: {
      exports: 'saveAs'
    },
    inflection: {
      exports: 'inflection'
    },
    leaflet: {
      deps: ['css!bower_components/leaflet/dist/leaflet.css']
    }
  },
  waitSeconds: 60
});
