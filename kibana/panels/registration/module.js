define(function (require) {
  'use strict';
  var angular = require('angular');  
  var app = require('app');
  var _ = require('lodash');
  var config = require('config');
  var googleAnalytics = require('../../../../../common/analytics');
  var gracePeriod = (86400000*6);
  var trialPeriod = (86400000*6);

  require('services/marvel/index');
  require('./directives/purchase_confirmation');
  require('./directives/registration');

  var deps = [
    'marvel.services',
    'marvel.directives.registration.purchaseConfirmation',
    'marvel.directives.registration.registration'
  ];
  
  var module = angular.module('kibana.panels.marvel.registration', deps);
  app.useModule(module);

  module.controller('marvel.registration', function ($scope, $modal, cacheBust, $q,
                                                     $phoneHome, kbnVersion) {

    var pageView = function () {
      if ($phoneHome.get('version') && $phoneHome.get('report')) {
        googleAnalytics.pageview();
      }
    };

    $scope.sysadminModal = function () {

      $scope.options = {
        showRegistration: false,
        showConfirmation: false
      };

      var panelModal = $modal({
        template: './app/panels/marvel/registration/sysadmin.html?' + cacheBust,
        persist: true,
        backdrop: 'static',
        show: false,
        scope: $scope,
        keyboard: false
      });

      // and show it
      $q.when(panelModal).then(function (modalEl) {
        modalEl.modal('show');
      });
    };

    $scope.optInModal = function () {

      $scope.options = {
        showRegistration: false,
        showConfirmation: false
      };

      var panelModal = $modal({
        template: './app/panels/marvel/registration/optin.html?' + cacheBust,
        persist: true,
        backdrop: 'static',
        show: false,
        scope: $scope,
        keyboard: false
      });

      // and show it
      $q.when(panelModal).then(function (modalEl) {
        modalEl.modal('show');
      });
    };


    $scope.registerModal = function () {
      var panelModal = $modal({
        template: './app/panels/marvel/registration/register.html?' + cacheBust,
        persist: true,
        backdrop: 'static',
        show: false,
        scope: $scope,
        keyboard: false
      });

      // and show it
      $q.when(panelModal).then(function (modalEl) {
        modalEl.modal('show');
      });
    };

    $scope.setOptIn = function (report, purchased) {
      $phoneHome.set({
        version: kbnVersion,
        report: report,
        purchased: purchased
      });
      $phoneHome.saveAll();
    };

    $scope.freeTrial = function () {
      // Only set the trialTimestamp if it doesn't exist
      if (!$phoneHome.get('trialTimestamp')) {
        $phoneHome.setTrialTimestamp(new Date().getTime());
        $scope.setOptIn($scope.report, false);
      }
      // Trigger the page view.
      pageView();
    };

    var delayTrial = function () {
      var trialTimestamp = $phoneHome.get('trialTimestamp');
      if(new Date().getTime()-trialTimestamp > trialPeriod) {
        return (new Date().getTime()) - gracePeriod;
      }
      return trialTimestamp;
    };


    $scope.register = function () {

      var registration = {
        first_name: $scope.registration.first_name,
        last_name: $scope.registration.last_name,
        email: $scope.registration.email,
        company: $scope.registration.company,
        phone: $scope.registration.phone,
        country: $scope.registration.country,
        state: $scope.registration.state
      };

      $phoneHome.register(registration).then(null, function () {
        $phoneHome.set('registered', false);
        $phoneHome.setTrialTimestamp(delayTrial());
        $scope.sysadmin = {
          data: { registered: true, version: kbnVersion, registrationData: registration, report: $phoneHome.get('report') },
          registered: true,
          host_port: config.elasticsearch
        };
        $scope.sysadminModal();
      });
    };

    $scope.registerLater = function  () {
      // subtract 6 days so it expires tomorrow 
      $phoneHome.setTrialTimestamp((new Date().getTime()) - gracePeriod);
    };

    $scope.confirmPurchase = function () {
      // This needs to be set because when the "Already Have License" button is
      // clicked we don't have the version or report status recorded.
      $phoneHome.set({
        version: kbnVersion,
        report: $scope.report
      });
      // Trigger a page view (this is similar to $scope.freeTrial)
      pageView();

      var registration = {
        first_name: $scope.registration.first_name,
        last_name: $scope.registration.last_name,
        company: $scope.registration.company,
        order_number: $scope.registration.order_number
      };

      $phoneHome.confirmPurchase(registration).then(null, function () {
        $phoneHome.set('purchased', false);
        $phoneHome.setTrialTimestamp(delayTrial());
        $scope.sysadmin = {
          data: { purchased: true, version: kbnVersion, registrationData: registration, report: $phoneHome.get('report') },
          purchased: true,
          host_port: config.elasticsearch
        };
        $scope.sysadminModal();
      });
    };

    $scope.clearMarvelStorage = function () {
      $phoneHome.destroy();
    };

    $phoneHome.on('change:data', function (val) {
      $scope.data = val; 
    });

    $phoneHome.on('change:report', function (val) {
      $scope.report = val; 
    });

    $phoneHome.on('change:purchased', function (val) {
      $scope.purchased = val; 
    });

    $phoneHome.on('change:registered', function (val) {
      $scope.registered = val; 
    });

    $scope.init = function () {
      $scope.kbnVersion = kbnVersion;
      $scope.options = {
        showRegistration: false,
        showConfirmation: false
      };

      $phoneHome.fetch().always(function () {
        $scope.report = $phoneHome.get('report');
        $scope.purchased = $phoneHome.get('purchased');
        $scope.registered = $phoneHome.get('registered');
        $scope.registration = $phoneHome.get('registrationData');

        // Trigger a page view
        pageView();

        // If the user is registered or has purchased then we can skip the
        // rest of the checkes.
        if ($scope.registered || $scope.purchased) {
          return;
        }

        if (_.isUndefined($phoneHome.get('trialTimestamp'))) {
          $scope.optInModal();
        } else {
          if ($phoneHome.checkRegistratonStatus()) {
            $scope.registerModal();
          }
        }
      });
    };

  });

  module.controller('marvel.registration.editor', function ($scope, $phoneHome, kbnVersion) {
    $scope.$watch('report', function (val) {
      $phoneHome.set('report', val);
      $phoneHome.saveAll();
    });
    $scope.clearMarvelStorage = function () {
      $phoneHome.destroy();
    };
    $scope.init = function () {
      $scope.kbnVersion = kbnVersion;
      $phoneHome.fetch().then(function () {
        $scope.report = $phoneHome.get('report');
        $scope.purchased = $phoneHome.get('purchased');
        $scope.registered = $phoneHome.get('registered');
        $scope.registration = $phoneHome.get('registrationData');
      });
    };
  });

});
