define(function (require) {
  var _ = require('lodash');
  var wrapRouteWithPrep = require('utils/routes/_wrap_route_with_prep');

  require('components/setup/setup');
  require('services/promises');

  function RouteManager() {
    var when = [];
    var additions = [];
    var otherwise;

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
      config: function ($routeProvider) {
        when.forEach(function (args) {
          var path = args[0];
          var route = args[1] || {};

          // merge in any additions
          additions.forEach(function (addition) {
            if (addition[0].test(path)) {
              route.resolve = _.assign(route.resolve || {}, addition[1]);
            }
          });

          if (route.reloadOnSearch === void 0) {
            route.reloadOnSearch = false;
          }

          wrapRouteWithPrep(route);
          $routeProvider.when(path, route);
        });

        if (otherwise) {
          wrapRouteWithPrep(otherwise);
          $routeProvider.otherwise(otherwise);
        }
      },
      RouteManager: RouteManager
    };
  }

  return new RouteManager();
});