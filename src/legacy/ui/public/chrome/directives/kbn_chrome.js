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
import { fatalError } from 'ui/notify/fatal_error';

import { uiModules } from '../../modules';
import template from './kbn_chrome.html';

import { I18nContext } from '../../i18n';
import { npStart } from '../../new_platform';
import {
  chromeHeaderNavControlsRegistry,
  NavControlSide,
} from '../../registry/chrome_header_nav_controls';
import { subscribeWithScope } from '../../../../../plugins/kibana_legacy/public';

export function kbnChromeProvider(chrome, internals) {
  uiModules.get('kibana').directive('kbnChrome', () => {
    return {
      template() {
        const $content = $(template);
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
      controller($scope, $location, Private) {
        $scope.getFirstPathSegment = () => {
          return $location.path().split('/')[1];
        };

        // Continue to support legacy nav controls not registered with the NP.
        const navControls = Private(chromeHeaderNavControlsRegistry);
        (navControls.bySide[NavControlSide.Left] || []).forEach((navControl) =>
          npStart.core.chrome.navControls.registerLeft({
            order: navControl.order,
            mount: navControl.render,
          })
        );
        (navControls.bySide[NavControlSide.Right] || []).forEach((navControl) =>
          npStart.core.chrome.navControls.registerRight({
            order: navControl.order,
            mount: navControl.render,
          })
        );

        // Non-scope based code (e.g., React)

        // Banners
        const bannerListContainer = document.getElementById('globalBannerList');
        if (bannerListContainer) {
          // This gets rendered manually by the legacy platform because this component must be inside the .app-wrapper
          ReactDOM.render(
            <I18nContext>{npStart.core.overlays.banners.getComponent()}</I18nContext>,
            bannerListContainer
          );
        }

        const chromeVisibility = subscribeWithScope(
          $scope,
          chrome.visible$,
          {
            next: () => {
              // just makes sure change detection is triggered when chrome visibility changes
            },
          },
          fatalError
        );
        $scope.$on('$destroy', () => {
          chromeVisibility.unsubscribe();
        });

        return chrome;
      },
    };
  });
}
