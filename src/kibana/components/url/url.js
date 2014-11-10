define(function (require) {
  require('filters/uriescape');
  require('filters/rison');
  var _ = require('lodash');
  var rison = require('utils/rison');
  var location = require('modules').get('kibana/url');

  location.service('kbnUrl', function ($route, $location, $rootScope, globalState, $parse) {
    var self = this;

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


    self._changeLocation = function (type, url, paramObj, redirect) {
      if (_.isBoolean(paramObj)) {
        redirect = paramObj;
        paramObj = undefined;
      }

      url = self.eval(url, paramObj);

      if (url !== $location[type]()) {
        $location[type](url);
      }

      if (redirect) {
        self.reload();
        $location.replace();
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
      $route.reload();
    };
  });
});
