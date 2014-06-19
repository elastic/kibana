define(function (require) {
  var _ = require('lodash');

  var when = [];
  var additions = [];
  var otherwise;

  var wrapRouteWithPrep = require('utils/routes/_wrap_route_with_prep');

  require('components/setup/setup');

  require('modules').get('kibana/controllers')
  .config(function ($provide) {
    // decorate the $route object to include a change and changeUrl method
    $provide.decorator('$route', function ($delegate, $location, $rootScope) {
      var reloading;
      var doneReloading = function () { reloading = false; };
      $rootScope.$on('$routeUpdate', doneReloading);
      $rootScope.$on('$routeChangeStart', doneReloading);

      var reload = function () {
        if (!reloading) $delegate.reload();
        reloading = true;
      };

      $delegate.change = function (path) {
        if (path !== $location.path()) {
          $location.path(path);
          reload();
        }
      };
      $delegate.changeUrl = function (url) {
        if (url !== $location.url()) {
          $location.url(url);
          reload();
        }
      };

      return $delegate;
    });
  });

  return {
    when: function (path, route) {
      when.push([path, route]);
      return this;
    },
    // before attaching the routes to the routeProvider, test the RE
    // against the .when() path and add/override the resolves if there is a match
    addResolves: function (RE, additionalResolves) {
      additions.push([RE, additionalResolves]);
      return this;
    },
    otherwise: function (route) {
      otherwise = route;
      return this;
    },
    config: function ($routeProvider, $injector) {
      when.forEach(function (args) {
        var path = args[0];
        var route = args[1];

        // merge in any additions
        additions.forEach(function (addition) {
          if (addition[0].test(path)) _.assign(route.resolve, addition[1]);
        });

        if (route.reloadOnSearch === void 0) {
          route.reloadOnSearch = false;
        }

        wrapRouteWithPrep(route);
        $routeProvider.when(args[0], args[1]);
      });

      if (otherwise) {
        $routeProvider.otherwise(otherwise);
      }
    }
  };
});