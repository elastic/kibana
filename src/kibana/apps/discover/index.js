define(function (require, module, exports) {
  require('directives/table');
  require('./services/saved_searches');
  require('./directives/timechart');
  require('./directives/field_chooser');
  require('./controllers/discover');

  var app = require('modules').get('app/discover');

  app.config(function ($routeProvider) {
    $routeProvider.when('/discover/:id?', {
      templateUrl: 'kibana/apps/discover/index.html',
      reloadOnSearch: false,
      resolve: {
        search: function (savedSearches, $route) {
          return savedSearches.get($route.current.params.id);
        }
      }
    });
  });
});