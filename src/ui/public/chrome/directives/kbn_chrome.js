import $ from 'jquery';

import UiModules from 'ui/modules';

export default function (chrome, internals) {

  UiModules
  .get('kibana')
  .directive('kbnChrome', function ($rootScope, appSwitcherState) {
    return {
      template($el) {
        const $content = $(require('ui/chrome/chrome.html'));
        const $app = $content.find('.application');

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
      controller($scope, $rootScope, $location, $http) {

        // are we showing the embedded version of the chrome?
        internals.setVisibleDefault(!$location.search().embed);

        // listen for route changes, propogate to tabs
        const onRouteChange = function () {
          let { href } = window.location;
          internals.trackPossibleSubUrl(href);
        };

        $rootScope.$on('$routeChangeSuccess', onRouteChange);
        $rootScope.$on('$routeUpdate', onRouteChange);
        onRouteChange();

        // and some local values
        chrome.httpActive = $http.pendingRequests;
        $scope.notifList = require('ui/notify')._notifs;

        // App switcher functionality.
        function updateAppSwitcher(isOpen) {
          $scope.appSwitcherButton = {
            classes: isOpen ? 'app-switcher-link--close' : undefined,
            title: isOpen ? 'Collapse' : 'Expand',
            tooltip: isOpen ? 'Collapse side bar' : 'Expand side bar',
          };
        }

        $scope.isAppSwitcherOpen = appSwitcherState.isOpen();
        updateAppSwitcher($scope.isAppSwitcherOpen);

        $scope.toggleAppSwitcher = event => {
          event.preventDefault();
          $scope.isAppSwitcherOpen = !$scope.isAppSwitcherOpen;
          appSwitcherState.setOpen($scope.isAppSwitcherOpen);
          updateAppSwitcher($scope.isAppSwitcherOpen);

          // Notify visualizations, e.g. the dashboard, that they should re-render.
          $scope.$root.$broadcast('ready:vis');
        };

        return chrome;
      }
    };
  });

}
