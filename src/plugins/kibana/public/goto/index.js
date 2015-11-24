define(function (require) {
  var angular = require('angular');

  require('ui/routes')
  .when('/goto/:id', {
    template: require('plugins/kibana/dashboard/index.html'),
    resolve: {
      dash: function (savedDashboards, Notifier, $route, $location, courier) {
        return savedDashboards.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          'dashboard' : '/dashboard'
        }));
      }
    }
  });

  require('ui/routes')
  .when('/visualize', {
    redirectTo: '/visualize/step/1'
  });

});
