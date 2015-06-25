define(function (require) {
  var _ = require('lodash');
  var wrapRouteWithPrep = require('utils/routes/_wrap_route_with_prep');

  require('components/setup/setup');
  require('components/promises');

  function RouteManager() {
    var when = [];
    var defaults = [];
    var otherwise;

    return {
      when: function (path, route) {
        when.push([path, route]);
        return this;
      },
      // before attaching the routes to the routeProvider, test the RE
      // against the .when() path and add/override the resolves if there is a match
      defaults: function (RE, def) {
        defaults.push([RE, def]);
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

          // merge in any defaults
          defaults.forEach(function (args) {
            if (args[0].test(path)) {
              _.merge(route, args[1]);
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
