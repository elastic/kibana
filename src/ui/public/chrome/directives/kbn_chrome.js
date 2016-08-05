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
        function updateAppSwitcher() {
          const isOpen = appSwitcherState.isOpen();
          $scope.isAppSwitcherOpen = isOpen;
          $scope.appSwitcherButton = {
            classes: isOpen ? 'app-switcher-link--close' : undefined,
            title: isOpen ? 'Collapse' : 'Expand',
            tooltip: isOpen ? 'Collapse side bar' : 'Expand side bar',
          };

          // Notify visualizations, e.g. the dashboard, that they should re-render.
          $scope.$root.$broadcast('appSwitcher:update');
        }

        updateAppSwitcher();

        $scope.$root.$on('appSwitcherState:change', () => {
          updateAppSwitcher();
        });

        $scope.toggleAppSwitcher = event => {
          event.preventDefault();
          appSwitcherState.setOpen(!appSwitcherState.isOpen());
        };

        return chrome;
      }
    };
  });

}
