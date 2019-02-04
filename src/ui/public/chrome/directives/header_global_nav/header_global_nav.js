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

const module = uiModules.get('kibana');

module.directive('headerGlobalNav', (reactDirective, chrome, Private) => {
  const navControls = Private(chromeHeaderNavControlsRegistry);
  const navLinks = chrome.getNavLinks();
  const homeHref = chrome.addBasePath('/app/kibana#/home');

  return reactDirective(wrapInI18nContext(Header), [
    // scope accepted by directive, passed in as React props
    'appTitle',
    'isVisible',
  ],
  {},
  // angular injected React props
  {
    breadcrumbs$: chrome.breadcrumbs.get$(),
    navLinks,
    navControls,
    homeHref
  });
});
