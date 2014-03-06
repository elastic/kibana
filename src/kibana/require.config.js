require.config({
  baseUrl: './kibana',
  paths: {
    kibana: './index',
    courier: '../courier',
    angular: '../bower_components/angular/angular',
    'angular-mocks': '../bower_components/angular-mocks/angular-mocks',
    'angular-route': '../bower_components/angular-route/angular-route',
    async: '../bower_components/async/lib/async',
    css: '../bower_components/require-css/css',
    text: '../bower_components/requirejs-text/text',
    d3: '../bower_components/d3/d3',
    elasticsearch: '../bower_components/elasticsearch/elasticsearch.angular',
    jquery: '../bower_components/jquery/dist/jquery',
    lodash: '../bower_components/lodash/dist/lodash',
    moment: '../bower_components/moment/moment',
    gridster: '../bower_components/gridster/dist/jquery.gridster',
    modules: 'utils/modules',
    bower_components: '../bower_components'
  },
  shim: {
    angular: {
      deps: ['jquery'],
      exports: 'angular'
    },
    gridster: {
      deps: ['jquery']
    },
    'angular-route': {
      deps: ['angular']
    },
    'angular-mocks': {
      deps: ['angular']
    },
    'elasticsearch': {
      deps: ['angular']
    }
  },
  waitSeconds: 60
});