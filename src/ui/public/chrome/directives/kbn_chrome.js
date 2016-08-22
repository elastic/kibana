import $ from 'jquery';
import { remove } from 'lodash';

import UiModules from 'ui/modules';
import ConfigTemplate from 'ui/ConfigTemplate';
import { isSystemApiRequest } from 'ui/system_api';

export default function (chrome, internals) {

  UiModules
  .get('kibana')
  .directive('kbnChrome', function ($rootScope) {
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
          let persist = chrome.getVisible();
          internals.trackPossibleSubUrl(href);
          internals.tabs.consumeRouteUpdate(href, persist);
        };

        $rootScope.$on('$routeChangeSuccess', onRouteChange);
        $rootScope.$on('$routeUpdate', onRouteChange);
        onRouteChange();

        const allPendingHttpRequests = () => $http.pendingRequests;
        const removeSystemApiRequests = (pendingHttpRequests = []) => remove(pendingHttpRequests, isSystemApiRequest);
        $scope.$watchCollection(allPendingHttpRequests, removeSystemApiRequests);

        // and some local values
        chrome.httpActive = $http.pendingRequests;
        $scope.notifList = require('ui/notify')._notifs;
        $scope.appSwitcherTemplate = new ConfigTemplate({
          switcher: '<app-switcher></app-switcher>'
        });

        return chrome;
      }
    };
  });

}
