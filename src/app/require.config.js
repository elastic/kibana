/**
 * Bootstrap require with the needed config, then load the app.js module.
 */
require.config({
  baseUrl: 'app',
  paths: {
    angular:  '../bower_components/angular/angular',
    lodash:   '../bower_components/lodash/lodash',
    jquery:   '../bower_components/jquery/jquery',
    d3:       '../bower_components/d3/d3'
  },
  shim: {
    angular: {
      deps: ['jquery'],
      exports: 'angular'
    }
  },
  waitSeconds: 60
});