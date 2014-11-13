define(function (require) {
  require('filters/uriescape');
  require('filters/rison');
  var _ = require('lodash');
  var rison = require('utils/rison');
  var location = require('modules').get('kibana/url');

  location.service('kbnUrl', function ($route, $location, $rootScope, globalState, $parse) {
    var self = this;
    var reloading;
    var unbindListener;

    self.change = function (url, paramObj) {
      self._changeLocation('url', url, paramObj);
    };

    self.changePath = function (path, paramObj) {
      self._changeLocation('path', path, paramObj);
    };

    self.redirect = function (url, paramObj) {
      self._changeLocation('url', url, paramObj, true);
    };

    self.redirectPath = function (path, paramObj) {
      self._changeLocation('path', path, paramObj, true);
    };

    self._changeLocation = function (type, url, paramObj, replace) {
      var prev = {
        path: $location.path(),
        search: $location.search()
      };

      url = self.eval(url, paramObj);
      $location[type](url);
      if (replace) $location.replace();

      var next = {
        path: $location.path(),
        search: $location.search()
      };

      if (self.shouldAutoReload(next, prev)) {
        reloading = $rootScope.$on('$locationChangeSuccess', function () {
          // call the "unlisten" function returned by $on
          reloading();
          reloading = false;

          $route.reload();
        });
      }
    };

    self.eval = function (url, paramObj) {
      paramObj = paramObj || {};

      return parseUrlPrams(url, paramObj);
    };

    self.getRoute = function () {
      return $route.current && $route.current.$$route;
    };

    self.shouldAutoReload = function (next, prev) {
      if (reloading) return false;

      var route = self.getRoute();
      if (!route) return false;

      if (next.path !== prev.path) return false;

      var reloadOnSearch = route.reloadOnSearch;
      var searchSame = _.isEqual(next.search, prev.search);

      return (reloadOnSearch && searchSame) || !reloadOnSearch;
    };

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

  });
});
