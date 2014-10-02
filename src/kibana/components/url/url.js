define(function (require) {
  require('filters/uriescape');
  require('filters/rison');
  var _ = require('lodash');
  var rison = require('utils/rison');
  var location = require('modules').get('kibana/url');

  location.service('kbnUrl', function ($route, $location, $rootScope, globalState, $parse) {
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

      if (url !== $location[type]()) {
        $location[type](url);
        doReload = !self.matches(url);
      }

      if (forceReload || doReload) {
        self.reload();
      }
    };

    self.eval = function (url, paramObj) {
      paramObj = paramObj || {};

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
      return url.replace(/\{\{([^\}]+)\}\}/g, function (match, expr) {
        // remove filters
        var key = expr.split('|')[0].trim();

        // verify that the expression can be evaluated
        var p = $parse(key)(paramObj);

        // if evaluation can't be made, throw
        if (_.isUndefined(p)) {
          throw new Error('Replacement failed, unresolved expression: ' + expr);
        }

        // append uriescape filter if not included
        if (expr.indexOf('uriescape') === -1) {
          expr += '|uriescape';
        }

        return $parse(expr)(paramObj);
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
