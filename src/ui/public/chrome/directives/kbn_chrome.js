import $ from 'jquery';
import { remove } from 'lodash';

import './kbn_chrome.less';
import { uiModules } from 'ui/modules';
import { isSystemApiRequest } from 'ui/system_api';
import {
  getUnhashableStatesProvider,
  unhashUrl,
} from 'ui/state_management/state_hashing';
import { notify } from 'ui/notify';

export function kbnChromeProvider(chrome, internals) {

  uiModules
  .get('kibana')
  .directive('kbnChrome', () => {
    return {
      template() {
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
        const getUnhashableStates = Private(getUnhashableStatesProvider);

        // are we showing the embedded version of the chrome?
        internals.setVisibleDefault(!$location.search().embed);

        // listen for route changes, propogate to tabs
        const onRouteChange = function () {
          const urlWithHashes = window.location.href;
          const urlWithStates = unhashUrl(urlWithHashes, getUnhashableStates());
          internals.trackPossibleSubUrl(urlWithStates);
        };

        $rootScope.$on('$routeChangeSuccess', onRouteChange);
        $rootScope.$on('$routeUpdate', onRouteChange);
        onRouteChange();

        const allPendingHttpRequests = () => $http.pendingRequests;
        const removeSystemApiRequests = (pendingHttpRequests = []) => remove(pendingHttpRequests, isSystemApiRequest);
        $scope.$watchCollection(allPendingHttpRequests, removeSystemApiRequests);

        // and some local values
        chrome.httpActive = $http.pendingRequests;
        $scope.notifList = notify._notifs;

        return chrome;
      }
    };
  });

}
