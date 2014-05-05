define(function (require) {
  'use strict';
  var angular = require('angular');  
  var app = require('app');

  var module = angular.module('marvel.directives.registration.purchaseConfirmation', []);
  app.useModule(module);

  module.directive('purchaseConfirmation', function () {
    return {
      restrict: 'E',
      scope: {
        registration: '=',
        options: '=',
        confirmPurchase: '=',
        dismiss: '='
      },
      templateUrl: './app/panels/marvel/registration/directives/purchase_confirmation.html'
    };
  });

  return module;
});
