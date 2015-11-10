var $ = require('jquery');
var _ = require('lodash');

require('../appSwitcher');
var modules = require('ui/modules');
var ConfigTemplate = require('ui/ConfigTemplate');
require('ui/directives/config');

module.exports = function (chrome, internals) {
  chrome.setupAngular = function () {
    var kibana = modules.get('kibana');

    _.forOwn(chrome.getInjected(), function (val, name) {
      kibana.value(name, val);
    });

    kibana
    .value('kbnVersion', internals.version)
    .value('buildNum', internals.buildNum)
    .value('buildSha', internals.buildSha)
    .value('sessionId', Date.now())
    .value('esUrl', (function () {
      var a = document.createElement('a');
      a.href = '/elasticsearch';
      return a.href;
    }()))
    .config(chrome.$setupCsrfRequestInterceptor)
    .directive('kbnChrome', function ($rootScope) {
      return {
        template: function ($el) {
          var $content = $(require('ui/chrome/chrome.html'));
          var $app = $content.find('.application');

          if (internals.rootController) {
            $app.attr('ng-controller', internals.rootController);
          }

          if (internals.rootTemplate) {
            $app.removeAttr('ng-view');
            $app.html(internals.rootTemplate);
          }

          return $content;
        },
        controllerAs: 'chrome',
        controller: function ($scope, $rootScope, $location, $http) {

          // are we showing the embedded version of the chrome?
          internals.setVisibleDefault(!$location.search().embed);

          // listen for route changes, propogate to tabs
          var onRouteChange = function () {
            let { href } = window.location;
            let persist = chrome.getVisible();
            internals.trackPossibleSubUrl(href);
            internals.tabs.consumeRouteUpdate(href, persist);
          };

          $rootScope.$on('$routeChangeSuccess', onRouteChange);
          $rootScope.$on('$routeUpdate', onRouteChange);
          onRouteChange();

          // and some local values
          $scope.httpActive = $http.pendingRequests;
          $scope.notifList = require('ui/notify')._notifs;
          $scope.appSwitcherTemplate = new ConfigTemplate({
            switcher: '<app-switcher></app-switcher>'
          });

          return chrome;
        }
      };
    });

    modules.link(kibana);
  };

};
