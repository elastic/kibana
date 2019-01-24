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

import './app_switcher';
import './global_nav_link';
import 'ui/i18n';

import globalNavTemplate from './global_nav.html';
import './global_nav.less';
import { uiModules } from '../../../modules';

const module = uiModules.get('kibana');

module.directive('globalNav', (globalNavState, chrome, i18n) => {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      chrome: '=',
      isVisible: '=',
      logoBrand: '=',
      smallLogoBrand: '=',
      appTitle: '=',
    },
    template: globalNavTemplate,
    link: scope => {
      // App switcher functionality.
      function updateGlobalNav() {
        const isOpen = globalNavState.isOpen();
        scope.isGlobalNavOpen = isOpen;
        scope.globalNavToggleButton = {
          classes: isOpen ? 'kbnGlobalNavLink--close' : undefined,
          title: isOpen
            ? i18n('common.ui.chrome.globalNav.navToggleButtonCollapseTitle', {
              defaultMessage: 'Collapse',
            })
            : i18n('common.ui.chrome.globalNav.navToggleButtonExpandTitle', {
              defaultMessage: 'Expand',
            }),
          tooltipContent: isOpen
            ? i18n('common.ui.chrome.globalNav.navToggleButtonCollapseTooltip', {
              defaultMessage: 'Collapse side bar',
            })
            : i18n('common.ui.chrome.globalNav.navToggleButtonExpandTooltip', {
              defaultMessage: 'Expand side bar',
            }),
        };

        // Notify visualizations, e.g. the dashboard, that they should re-render.
        scope.$root.$broadcast('globalNav:update');
      }

      updateGlobalNav();

      scope.$root.$on('globalNavState:change', () => {
        updateGlobalNav();
      });

      scope.getHref = path => {
        return chrome.addBasePath(path);
      };

      scope.toggleGlobalNav = event => {
        event.preventDefault();
        globalNavState.setOpen(!globalNavState.isOpen());
      };

      scope.isHomeActive = () => {
        return window.location.hash.indexOf('#/home') === 0;
      };
    },
  };
});
