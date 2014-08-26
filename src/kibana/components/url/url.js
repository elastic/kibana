define(function (require) {
  var location = require('modules').get('kibana/url');

  location.service('kbnUrl', function ($route, $location, $rootScope, globalState) {
    var reloading = false;

    function KbnUrl() {
    }

    KbnUrl.prototype.changePath = function (path) {
      if (path !== $location.path()) {
        $location.path(globalState.writeToUrl(path));
        reload();
      }
    };

    KbnUrl.prototype.change = function (url) {
      if (url !== $location.url()) {
        $location.url(globalState.writeToUrl(url));
        reload();
      }
    };

    KbnUrl.prototype.matches = function (url) {
      var route = $route.current.$$route;
      if (!route || !route.regexp) return null;
      return route.regexp.test(url);
    };

    $rootScope.$on('$routeUpdate', reloadingComplete);
    $rootScope.$on('$routeChangeStart', reloadingComplete);

    function reload() {
      if (!reloading) $route.reload();
      reloading = true;
    }

    function reloadingComplete() {
      reloading = false;
    }

    return new KbnUrl();
  });
});
