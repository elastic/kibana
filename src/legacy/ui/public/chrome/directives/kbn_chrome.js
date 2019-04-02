/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import $ from 'jquery';
import url from 'url';

import { uiModules } from '../../modules';
import {
  getUnhashableStatesProvider,
  unhashUrl,
} from '../../state_management/state_hashing';
import {
  notify,
  GlobalBannerList,
  banners,
} from '../../notify';
import { SubUrlRouteFilterProvider } from './sub_url_route_filter';
import { I18nContext } from '../../i18n';

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
        controller($scope, $rootScope, Private, $location) {
          const getUnhashableStates = Private(getUnhashableStatesProvider);
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

          $rootScope.$on('$locationChangeStart', (e, newUrl) => {
            // This handler fixes issue #31238 where browser back navigation
            // fails due to angular 1.6 parsing url encoded params wrong.
            const absUrlHash = url.parse($location.absUrl()).hash.slice(1);
            const decodedAbsUrlHash = decodeURIComponent(absUrlHash);
            const hash = url.parse(newUrl).hash.slice(1);
            const decodedHash = decodeURIComponent(hash);
            if (absUrlHash !== hash && decodedHash === decodedAbsUrlHash) {
              // replace the urlencoded hash with the version that angular sees.
              $location.url(absUrlHash).replace();
            }
          });

          $rootScope.$on('$routeChangeSuccess', onRouteChange);
          $rootScope.$on('$routeUpdate', onRouteChange);
          updateSubUrls(); // initialize sub urls

          // Notifications
          $scope.notifList = notify._notifs;

          // Non-scope based code (e.g., React)

          // Banners
          ReactDOM.render(
            <I18nContext>
              <GlobalBannerList
                banners={banners.list}
                subscribe={banners.onChange}
              />
            </I18nContext>,
            document.getElementById('globalBannerList')
          );

          return chrome;
        }
      };
    });

}
