/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



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
