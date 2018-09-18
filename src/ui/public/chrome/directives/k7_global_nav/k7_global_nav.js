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


// import './app_switcher';
// import './global_nav_link';

import { uiModules } from '../../../modules';
import { Header } from './components/header';
import k7GlobalNavTemplate from './k7_global_nav.html';
import './k7_global_nav.less';

const module = uiModules.get('kibana');

module.directive('k7Header', (reactDirective) => {
  return reactDirective(Header, [
    ['navLinks', { watchDepth: 'collection' }],
    'appTitle',
    'isVisible',
    'otherProp'
  ]);
});

module.directive('k7GlobalNav', (globalNavState, chrome) => {
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
    template: k7GlobalNavTemplate,
    link: (scope) => {
      // TODO: change data binding to observable
      scope.navLinks = chrome.getNavLinks();
    }
  };
});
