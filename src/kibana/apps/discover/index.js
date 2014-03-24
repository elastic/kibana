define(function (require, module, exports) {
  require('directives/table');
  require('./field_chooser');
  require('./services/saved_searches');
  require('./timechart');
  require('./controllers/discover');

  var app = require('modules').get('app/discover');

  app.config(function ($routeProvider) {
    $routeProvider.when('/discover/:id?', {
      templateUrl: 'kibana/apps/discover/index.html',
      resolve: {
        search: function (savedSearches, $route) {
          return savedSearches.get($route.current.params.id);
        }
      }
    });
  });
});