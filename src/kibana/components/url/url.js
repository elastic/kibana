define(function (require) {
  require('filters/uriescape');
  require('filters/rison');
  var _ = require('lodash');
  var rison = require('utils/rison');
  var location = require('modules').get('kibana/url');

  location.service('kbnUrl', function ($route, $location, $rootScope, globalState) {
    var self = this;
    self.reloading = false;

    self.change = function (url, paramObj, forceReload) {
      self._changeLocation('url', url, paramObj, forceReload);
    };

    self.changePath = function (url, paramObj, forceReload) {
      self._changeLocation('path', url, paramObj, forceReload);
    };

    self._changeLocation = function (type, url, paramObj, forceReload) {
      var doReload = false;

      if (_.isBoolean(paramObj)) {
        forceReload = paramObj;
        paramObj = undefined;
      }

      url = self.eval(url, paramObj);

      // path change
      if (type === 'path') {
        if (url !== $location.path()) {
          $location.path(globalState.writeToUrl(url));
          doReload = (!self.matches(url));
        }
      // default to url change
      } else {
        if (url !== $location.url()) {
          $location.url(globalState.writeToUrl(url));
          doReload = (!self.matches(url));
        }
      }

      if (forceReload || doReload) {
        self.reload();
      }
    };

    self.eval = function (url, paramObj) {
      if (!_.isObject(paramObj)) {
        return url;
      }

      return parseUrlPrams(url, paramObj);
    };

    self.matches = function (url) {
      var route = $route.current.$$route;
      if (!route || !route.regexp) return false;
      return route.regexp.test(url);
    };

    $rootScope.$on('$routeUpdate', reloadingComplete);
    $rootScope.$on('$routeChangeStart', reloadingComplete);

    function parseUrlPrams(url, paramObj) {
      return url.replace(/\{([^\}]+)\}/g, function (match, expr) {
        var key = expr.split('|')[0].trim();

        if (_.isUndefined(paramObj[key])) {
          throw new Error('Replacement failed, key not found: ' + key);
        }

        // append uriescape filter if not included
        if (expr.indexOf('uriescape') === -1) {
          expr += '|uriescape';
        }

        return $rootScope.$eval(expr, paramObj);
      });
    }

    self.reload = function () {
      if (!self.reloading) {
        $route.reload();
        self.reloading = true;
      }
    };

    function reloadingComplete() {
      self.reloading = false;
    }
  });
});
