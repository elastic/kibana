define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var deferReady;
  var when = [];
  var additions = [];
  var otherwise;

  require('setup/setup');

  var prepWork = _.once(function ($q, kbnSetup, config) {
    return $q.all([
      kbnSetup(),
      config.init()
    ]);
  });

  var wrapResolvesWithPrepWork = function (resolves) {
    return _.mapValues(resolves, function (expr, name) {
      return function ($q, kbnSetup, config, $injector) {
        return prepWork($q, kbnSetup, config).then(function () {
          return $injector[angular.isString(expr) ? 'get': 'invoke'](expr);
        });
      };
    });
  };

  return {
    when: function (path, route) {
      if (route.resolve) {
        route.resolve = wrapResolvesWithPrepWork(route.resolve);
      } else if (!route.redirectTo) {
        route.resolve = {
          __prep__: function ($q, kbnSetup, config) {
            return prepWork($q, kbnSetup, config);
          }
        };
      }

      if (route.reloadOnSearch === void 0) {
        route.reloadOnSearch = false;
      }

      when.push([path, route]);
      return this;
    },
    // before attaching the routes to the routeProvider, test the RE
    // against the .when() path and add/override the resolves if there is a match
    addResolves: function (RE, additionalResolves) {
      additions.push([RE, wrapResolvesWithPrepWork(additionalResolves)]);
    },
    otherwise: function (route) {
      otherwise = route;
    },
    ready: function () {
      return deferReady();
    },
    config: function ($routeProvider, $injector) {
      when.forEach(function (args) {
        var path = args[0];
        var route = args[1];

        // currently, all "real" routes have resolves (even if not specifified by the owner)
        // if they don't it is because they are a redirect
        if (route.resolve) {
          // merge in any additions
          additions.forEach(function (addition) {
            if (addition[0].test(path)) _.assign(route.resolve, addition[1]);
          });
        }

        $routeProvider.when(args[0], args[1]);
      });

      if (otherwise) {
        $routeProvider.otherwise(otherwise);
      }
    }
  };
});