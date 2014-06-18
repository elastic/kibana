require.config({
  baseUrl: './kibana',
  paths: {
    kibana: './index',

    // special utils
    routes: 'utils/routes',
    errors: 'components/errors',
    modules: 'utils/modules',

    // bower_components
    angular: '../bower_components/angular/angular',
    'angular-mocks': '../bower_components/angular-mocks/angular-mocks',
    'angular-route': '../bower_components/angular-route/angular-route',
    'angular-bootstrap': '../bower_components/angular-bootstrap/ui-bootstrap-tpls',
    'angular-bindonce': '../bower_components/angular-bindonce/bindonce',
    'angular-ui-ace': '../bower_components/angular-ui-ace/ui-ace',
    'angular-elastic': '../bower_components/angular-elastic/elastic',
    ace: '../bower_components/ace-builds/src-noconflict/ace',
    async: '../bower_components/async/lib/async',
    css: '../bower_components/require-css/css',
    text: '../bower_components/requirejs-text/text',
    elasticsearch: '../bower_components/elasticsearch/dist/elasticsearch.angular',
    jquery: '../bower_components/jquery/dist/jquery',
    lodash: '../bower_components/lodash/dist/lodash',
    moment: '../bower_components/moment/moment',
    gridster: '../bower_components/gridster/dist/jquery.gridster',
    jsonpath: '../bower_components/jsonpath/lib/jsonpath',
    k4d3: '../components/K4D3/build/k4.d3',
    inflection: '../bower_components/inflection/lib/inflection',
    file_saver: '../bower_components/FileSaver/filesaver',
    bower_components: '../bower_components'
  },
  shim: {
    angular: {
      deps: ['jquery'],
      exports: 'angular'
    },
    jsonpath: {
      exports: 'jsonPath'
    },
    gridster: ['jquery'],
    'angular-route': ['angular'],
    'angular-mocks': ['angular'],
    'elasticsearch': ['angular'],
    'angular-bootstrap': ['angular'],
    'angular-bindonce': ['angular'],
    k4d3: ['jquery', 'lodash'],
    'angular-ui-ace': ['angular', 'ace'],
    inflection: {
      exports: 'inflection'
    },
    file_saver: {
      exports: 'saveAs'
    }
  },
  waitSeconds: 60
});
