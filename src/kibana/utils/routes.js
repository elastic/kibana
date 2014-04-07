define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var deferReady;
  var when = {};
  var otherwise;
  require('services/setup');

  return {
    when: function (path, route) {
      if (route.resolve) {
        route.resolve = _.mapValues(route.resolve, function (expr, name) {
          return function (setup, $injector) {
            return setup.bootstrap()
            .then(function () {
              return $injector[angular.isString(expr) ? 'get': 'invoke'](expr);
            });
          };
        });
      } else if (!route.redirectTo) {
        route.resolve = {
          bootstrap: function (setup) {
            return setup.bootstrap();
          }
        };
      }
      when[path] = route;
      return this;
    },
    otherwise: function (route) {
      otherwise = route;
    },
    ready: function () {
      return deferReady();
    },
    config: function ($routeProvider, $injector) {
      _.forOwn(when, function (route, path) {
        $routeProvider.when(path, route);
      });
      if (otherwise) {
        $routeProvider.otherwise(otherwise);
      }
    }
  };
});