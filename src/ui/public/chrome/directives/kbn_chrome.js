import React from 'react';
import ReactDOM from 'react-dom';
import $ from 'jquery';

import './kbn_chrome.less';
import { uiModules } from '../../modules';
import {
  getUnhashableStatesProvider,
  unhashUrl,
} from '../../state_management/state_hashing';
import {
  notify,
  GlobalToastList,
  toastNotifications,
  GlobalBannerList,
  banners,
} from '../../notify';
import { SubUrlRouteFilterProvider } from './sub_url_route_filter';

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
          if (Boolean($location.search().embed)) {
            internals.permanentlyHideChrome();
          }

          const subUrlRouteFilter = Private(SubUrlRouteFilterProvider);

          function updateSubUrls() {
            const urlWithHashes = window.location.href;
            const urlWithStates = unhashUrl(urlWithHashes, getUnhashableStates());
            internals.trackPossibleSubUrl(urlWithStates);
          }

          function onRouteChange($event) {
            if (subUrlRouteFilter($event)) {
              updateSubUrls();
            }
          }

          $rootScope.$on('$routeChangeSuccess', onRouteChange);
          $rootScope.$on('$routeUpdate', onRouteChange);
          updateSubUrls(); // initialize sub urls

          // Notifications
          $scope.notifList = notify._notifs;

          // Non-scope based code (e.g., React)

          // Banners
          ReactDOM.render(
            <GlobalBannerList
              banners={banners.list}
              subscribe={banners.onChange}
            />,
            document.getElementById('globalBannerList')
          );

          // Toast Notifications
          ReactDOM.render(
            <GlobalToastList
              toasts={toastNotifications.list}
              dismissToast={toastNotifications.remove}
              toastLifeTimeMs={6000}
              subscribe={toastNotifications.onChange}
            />,
            document.getElementById('globalToastList')
          );

          return chrome;
        }
      };
    });

}
