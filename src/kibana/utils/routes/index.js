define(function (require) {
  var _ = require('lodash');
  var wrapRouteWithPrep = require('utils/routes/_wrap_route_with_prep');

  require('components/setup/setup');
  require('services/promises');

  require('modules').get('kibana')
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
      $delegate.matches = function (url) {
        var route = $delegate.current.$$route;
        if (!route || !route.regexp) return null;
        return route.regexp.test(url);
      };

      return $delegate;
    });
  });

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