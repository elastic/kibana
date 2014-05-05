define(function (require) {
  'use strict';
  var angular = require('angular');  
  var app = require('app');

  var module = angular.module('marvel.directives.registration.registration', []);
  app.useModule(module);

  module.directive('registration', function () {
    return {
      restrict: 'E',
      scope: {
        registration: '=',
        options: '=',
        register: '=',
        registerLater: '=',
        dismiss: '='
      },
      templateUrl: './app/panels/marvel/registration/directives/registration.html'
    };
  });

  return module;
});

