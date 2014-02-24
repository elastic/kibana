require.config({
  baseUrl: 'kibana',
  paths: {
    courier: '../courier',
    angular: '../bower_components/angular/angular',
    'angular-route': '../bower_components/angular-route/angular-route',
    async: '../bower_components/async/lib/async',
    css: '../bower_components/require-css/css',
    d3: '../bower_components/d3/d3',
    elasticsearch: '../bower_components/elasticsearch/elasticsearch.angular',
    jquery: '../bower_components/jquery/jquery',
    lodash: '../bower_components/lodash/dist/lodash',
    moment: '../bower_components/moment/moment'
  },
  shim: {
    angular: {
      deps: ['jquery'],
      exports: 'angular'
    },
    'angular-route': {
      deps: ['angular']
    },
    'elasticsearch': {
      deps: ['angular']
    }
  },
  waitSeconds: 60
});