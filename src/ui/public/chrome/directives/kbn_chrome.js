import $ from 'jquery';

import './kbn_chrome.less';
import UiModules from 'ui/modules';
import { UnhashStatesProvider } from 'ui/state_management/unhash_states';

export default function (chrome, internals) {

  UiModules
  .get('kibana')
  .directive('kbnChrome', $rootScope => {
    return {
      template($el) {
        const $content = $(require('./kbn_chrome.html'));
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
      controller($scope, $rootScope, $location, $http, Private) {
        const unhashStates = Private(UnhashStatesProvider);

        // are we showing the embedded version of the chrome?
        internals.setVisibleDefault(!$location.search().embed);

        // listen for route changes, propogate to tabs
        const onRouteChange = function () {
          let { href } = window.location;
          internals.trackPossibleSubUrl(unhashStates.inAbsUrl(href));
        };

        $rootScope.$on('$routeChangeSuccess', onRouteChange);
        $rootScope.$on('$routeUpdate', onRouteChange);
        onRouteChange();

        // and some local values
        chrome.httpActive = $http.pendingRequests;
        $scope.notifList = require('ui/notify')._notifs;

        return chrome;
      }
    };
  });

}
