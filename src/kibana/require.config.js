require.config({
  baseUrl: './kibana',
  paths: {
    // components
    kibana: './index',
    courier: './components/courier',
    config: './components/config',
    field_types: './components/field_types',
    setup: './components/setup',
    notify: './components/notify',
    state_management: './components/state_management',

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
    elasticsearch: '../bower_components/elasticsearch/dist/elasticsearch.angular',
    jquery: '../bower_components/jquery/dist/jquery',
    lodash: '../bower_components/lodash/dist/lodash',
    moment: '../bower_components/moment/moment',
    gridster: '../bower_components/gridster/dist/jquery.gridster',
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
    'angular-bindonce': ['angular'],
    'k4d3': ['field_types/field_types']
  },
  waitSeconds: 60
});