/**
 * main app level module
 */
define(function (require) {
  var angular = require('angular');
  var $ = require('jquery');
  var modules = require('modules');
  var routes = require('routes');

  require('elasticsearch');
  require('angular-route');
  require('angular-bindonce');

  var CbQueue = require('utils/cb_queue');
  var configFile = require('config_file');

  var kibana = modules.get('kibana', [
    // list external requirements here
    'elasticsearch',
    'pasvaz.bindonce',
    'ngRoute'
  ]);

  configFile.elasticsearch = configFile.elasticsearch || ('http://' + window.location.hostname + ':9200');

  kibana
    // This stores the Kibana revision number, @REV@ is replaced by grunt.
    .constant('kbnVersion', '@REV@')
    // The minimum Elasticsearch version required to run Kibana
    .constant('minimumElasticsearchVersion', '1.2.1')
    // Use this for cache busting partials
    .constant('cacheBust', 'cache-bust=' + Date.now())
    // attach the route manager's known routes
    .config(routes.config);

  // setup routes
  routes
    .otherwise({
      redirectTo: '/' + configFile.defaultAppId
    });

  // tell the modules util to add it's modules as requirements for kibana
  modules.link(kibana);

  // list of modules that will require all possible applications
  var appModules = configFile.apps.map(function (app) {
    return 'apps/' + app.id + '/index';
  });

  var loadQueue = new CbQueue(function (cb) {
    require([
      'controllers/kibana'
    ], function loadApps() {
      require(appModules, cb);
    });
  });

  var initQueue = new CbQueue(function (cb) {
    loadQueue.push(function () {
      $(function () {
        angular
          .bootstrap(document, ['kibana'])
          .invoke(function () {
            $(document.body).children().show();
            cb();
          });
      });
    });
  });

  kibana.load = loadQueue.push;
  kibana.init = initQueue.push;

  return kibana;
});
