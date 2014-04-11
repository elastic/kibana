require.config({
  baseUrl: './kibana',
  paths: {
    // components
    kibana: './index',
    courier: './components/courier',
    config: './components/config',
    notify: './components/notify',
    saved_object: './components/saved_object',

    // special utils
    routes: 'utils/routes',
    modules: 'utils/modules',

    // bower_components
    angular: '../bower_components/angular/angular',
    'angular-mocks': '../bower_components/angular-mocks/angular-mocks',
    'angular-route': '../bower_components/angular-route/angular-route',
    'angular-bootstrap': '../bower_components/angular-bootstrap/ui-bootstrap-tpls',
    'angular-bindonce': '../bower_components/angular-bindonce/bindonce',
    async: '../bower_components/async/lib/async',
    css: '../bower_components/require-css/css',
    text: '../bower_components/requirejs-text/text',
    d3: '../bower_components/d3/d3',
    elasticsearch: '../bower_components/elasticsearch/elasticsearch.angular',
    jquery: '../bower_components/jquery/dist/jquery',
    lodash: '../bower_components/lodash/dist/lodash',
    moment: '../bower_components/moment/moment',
    gridster: '../bower_components/gridster/dist/jquery.gridster',
    stacktrace: '../bower_components/stacktrace.js/stacktrace',
    jsonpath: '../bower_components/jsonpath/lib/jsonpath',
    k4d3: '../bower_components/K4D3/build/k4.d3',
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
    'angular-bindonce': ['angular']
  },
  waitSeconds: 60
});