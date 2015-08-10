var modules = require('ui/modules');
var $ = require('jquery');
var _ = require('lodash');

module.exports = function (chrome, internals) {
  chrome.setupAngular = function () {
    var kibana = modules.get('kibana');

    kibana
    .constant('kbnVersion', internals.version)
    .constant('buildNum', internals.buildNum)
    .constant('buildSha', internals.buildSha)
    .constant('sessionId', Date.now())
    .directive('kbnChrome', function ($rootScope) {
      return {
        compile: function ($el) {
          var $content = $(require('ui/chrome/chrome.html'));
          var $app = $content.find('.application');

          if (internals.rootController) {
            $app.attr('ng-controller', internals.rootController);
          }

          if (internals.rootTemplate) {
            $app.removeAttr('ng-view');
            $app.html(internals.rootTemplate);
          }

          $el.html($content);
        },
        controllerAs: 'chrome',
        controller: function ($scope, $rootScope, $location, $http) {

          // are we showing the embedded version of the chrome?
          chrome.setVisible(!Boolean($location.search().embed));

          // listen for route changes, propogate to tabs
          var onRouteChange = _.bindKey(internals.tabs, 'consumeRouteUpdate', $location, chrome.getVisible());
          $rootScope.$on('$routeChangeSuccess', onRouteChange);
          $rootScope.$on('$routeUpdate', onRouteChange);
          onRouteChange();

          // and some local values
          $scope.httpActive = $http.pendingRequests;
          $scope.notifList = require('ui/notify')._notifs;

          return chrome;
        }
      };
    });

    modules.link(kibana);
  };

};
