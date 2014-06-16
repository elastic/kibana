define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var deferReady;
  var when = [];
  var additions = [];
  var otherwise;

  require('setup/setup');

  require('modules').get('kibana/controllers')
  .config(function ($provide) {
    $provide.decorator('$route', function ($delegate, $location, $rootScope) {

      // flag tracking when we are waiting for a reload
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
          $location.path(path); reload();
        }
      };
      $delegate.changeUrl = function (url) {
        if (url !== $location.url()) {
          $location.url(url); reload();
        }
      };

      return $delegate;
    });
  });

  var setup = function ($q, kbnSetup, config) {
    var prom = $q.all([
      kbnSetup(),
      config.init(),
    ]);

    // override setup to only return the promise
    setup = function () { return prom; };

    return prom;
  };

  var prepWork = function ($injector, config, $location, $route, Notifier) {
    return $injector.invoke(setup)
    .then(function () {
      if ($location.path().indexOf('/settings/indices') !== 0 && !config.get('defaultIndex')) {
        var notify = new Notifier();
        notify.error('Please specify a default index pattern');
        $route.change('/settings/indices');
      }
    });
  };

  var wrapResolvesWithPrepWork = function (resolves) {
    return _.mapValues(resolves, function (expr, name) {
      return function ($injector) {
        return $injector.invoke(prepWork).then(function () {
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
          __prep__: function ($injector) {
            return $injector.invoke(prepWork);
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