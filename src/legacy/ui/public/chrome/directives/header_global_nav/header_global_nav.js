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


import { uiModules } from '../../../modules';
import { Header } from './components/header';
import { wrapInI18nContext } from 'ui/i18n';
import { chromeHeaderNavControlsRegistry } from 'ui/registry/chrome_header_nav_controls';
import { npStart } from '../../../new_platform';
import { NavControlSide } from '.';

const module = uiModules.get('kibana');

module.directive('headerGlobalNav', (reactDirective, Private) => {
  const newPlatform = npStart.core;

  // Continue to support legacy nav controls not registered with the NP.
  // NOTE: in future change this needs to be moved out of this directive.
  const navControls = Private(chromeHeaderNavControlsRegistry);
  (navControls.bySide[NavControlSide.Left] || [])
    .forEach(navControl => newPlatform.chrome.navControls.registerLeft({
      order: navControl.order,
      mount: navControl.render,
    }));
  (navControls.bySide[NavControlSide.Right] || [])
    .forEach(navControl => newPlatform.chrome.navControls.registerRight({
      order: navControl.order,
      mount: navControl.render,
    }));

  return reactDirective(wrapInI18nContext(Header), [
    // scope accepted by directive, passed in as React props
    'appTitle',
  ],
  {},
  // angular injected React props
  {
    isVisible$: newPlatform.chrome.getIsVisible$(),
    badge$: newPlatform.chrome.getBadge$(),
    breadcrumbs$: newPlatform.chrome.getBreadcrumbs$(),
    helpExtension$: newPlatform.chrome.getHelpExtension$(),
    navLinks$: newPlatform.chrome.navLinks.getNavLinks$(),
    forceAppSwitcherNavigation$: newPlatform.chrome.navLinks.getForceAppSwitcherNavigation$(),
    homeHref: newPlatform.http.basePath.prepend('/app/kibana#/home'),
    uiCapabilities: newPlatform.application.capabilities,
    recentlyAccessed$: newPlatform.chrome.recentlyAccessed.get$(),
    navControlsLeft$: newPlatform.chrome.navControls.getLeft$(),
    navControlsRight$: newPlatform.chrome.navControls.getRight$(),
  });
});
