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

import { DomLocationProvider } from '../../../../dom_location';
import { parse } from 'url';
import { uiModules } from '../../../../modules';
import appSwitcherTemplate from './app_switcher.html';

uiModules
  .get('kibana')
  .provider('appSwitcherEnsureNavigation', function () {
    let forceNavigation = false;

    this.forceNavigation = function (val) {
      forceNavigation = !!val;
    };

    this.$get = ['Private', function (Private) {
      const domLocation = Private(DomLocationProvider);

      return function (event, link) {
        if (link.disabled) {
          event.preventDefault();
        }

        if (!forceNavigation || event.isDefaultPrevented() || event.altKey || event.metaKey || event.ctrlKey) {
          return;
        }

        const toParsed = parse(event.delegateTarget.href);
        const fromParsed = parse(domLocation.href);
        const sameProto = toParsed.protocol === fromParsed.protocol;
        const sameHost = toParsed.host === fromParsed.host;
        const samePath = toParsed.path === fromParsed.path;

        if (sameProto && sameHost && samePath) {
          toParsed.hash && domLocation.reload();

          // event.preventDefault() keeps the browser from seeing the new url as an update
          // and even setting window.location does not mimic that behavior, so instead
          // we use stopPropagation() to prevent angular from seeing the click and
          // starting a digest cycle/attempting to handle it in the router.
          event.stopPropagation();
        }
      };
    }];
  })
  .directive('appSwitcher', function () {
    return {
      restrict: 'E',
      scope: {
        chrome: '=',
      },
      template: appSwitcherTemplate,
      controllerAs: 'switcher',
      controller($scope, appSwitcherEnsureNavigation, globalNavState) {
        if (!$scope.chrome || !$scope.chrome.getNavLinks) {
          throw new TypeError('appSwitcher directive requires the "chrome" config-object');
        }

        this.links = $scope.chrome.getNavLinks();

        // links don't cause full-navigation events in certain scenarios
        // so we force them when needed
        this.ensureNavigation = appSwitcherEnsureNavigation;

        this.getTooltip = link => {
        // If the sidebar is open then we don't need to show the title because
        // it will already be visible.
          if (globalNavState.isOpen()) {
            return link.tooltip;
          }
          return link.tooltip ? link.title + ' - ' + link.tooltip : link.title;
        };
      }
    };
  });
