define(function (require) {
  var angular = require('angular');

  var module = angular.module('kibana/services');
  module.service('es', function (esFactory) {
    return esFactory();
  });
});