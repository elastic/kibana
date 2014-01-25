define([
  'angular',
  'lodash'
],
function (angular, _) {
  'use strict';

  var module = angular.module('kibana.factories');
  module.factory('storeFactory', function() {
    return function storeFactory($scope, name, defaults) {
      if (!$scope.$watch) {
        throw new TypeError('storeFactory\'s first arg must be a scope.');
      }

      if (!_.isString(name)) {
        throw new TypeError('storeFactory\'s second arg must be a unique name for this store (string).');
      }

      // get the current value, parse if it exists
      var current = localStorage.getItem(name);
      if (current != null) {
        try {
          current = JSON.parse(current);
        } catch (e) {
          current = null;
        }
      }

      if (current == null) {
        current = defaults || {};
      }

      if (_.isPlainObject(current)) {
        _.defaults(current, defaults);
      } else {
        throw new TypeError('Invalid store value' + current);
      }

      if ('defineProperty' in Object) {
        Object.defineProperty($scope, name, {
          enumerable: true,
          configurable: true,
          writable: false,
          value: current
        });
      } else {
        $scope[name] = current;
      }

      // listen for changes and store them in localStorage,
      // unless it is set to undefined then it will be removed
      $scope.$watch(name, function (val) {
        localStorage.setItem(name, JSON.stringify(val));
      }, true);

      return current;
    };
  });

});