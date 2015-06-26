define(function (require) {
  require('css!appSwitcher/appSwitcher.css');

  require('routes')
  .when('/', {
    template: require('text!appSwitcher/appSwitcher.html'),
    resolve: {
      apps: function ($http) {
        return $http.get('/api/apps').then(function (resp) {
          return resp.data;
        });
      }
    },
    controllerAs: 'apps',
    controller: function ($route) {
      this.all = $route.current.locals.apps;
    }
  });
});
