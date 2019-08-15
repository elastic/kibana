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

import 'ngreact';
import { wrapInI18nContext } from 'ui/i18n';
import { uiModules } from 'ui/modules';
import { TopNavMenu } from '../../../core_plugins/kibana_react/public';
import { Storage } from 'ui/storage';
import chrome from 'ui/chrome';


const module = uiModules.get('kibana');

module.directive('kbnTopNavV2', () => {
  return {
    restrict: 'E',
    template: '',
    compile: (elem) => {
      const child = document.createElement('kbn-top-nav-v2-helper');

      // Copy attributes to the child directive
      for (const attr of elem[0].attributes) {
        child.setAttribute(attr.name, attr.value);
      }

      // Add a special attribute that will change every time that one
      // of the config array's disableButton function return value changes.
      child.setAttribute('disabled-buttons', 'disabledButtons');

      // Pass in storage
      const localStorage = new Storage(window.localStorage);
      child.setAttribute('store', 'store');
      child.setAttribute('ui-settings', 'uiSettings');

      // Append helper directive
      elem.append(child);

      const linkFn = ($scope, _, $attr) => {
        $scope.store = localStorage;
        $scope.uiSettings = chrome.getUiSettingsClient();

        // Watch config changes
        $scope.$watch(() => {
          const config = $scope.$eval($attr.config) || [];
          return config.map((item) => {
            // Copy key into id, as it's a reserved react propery.
            // This is done for Angular directive backward compatibility.
            // In React only id is recognized.
            if (item.key && !item.id) {
              item.id = item.key;
            }

            // Watch the disableButton functions
            if (typeof item.disableButton === 'function') {
              return item.disableButton();
            }
            return item.disableButton;
          });
        }, (newVal) => {
          $scope.disabledButtons = newVal;
        },
        true);
      };

      return linkFn;
    }
  };
});

module.directive('kbnTopNavV2Helper', (reactDirective) => {
  return reactDirective(
    wrapInI18nContext(TopNavMenu),
    [
      ['name', { watchDepth: 'reference' }],
      ['config', { watchDepth: 'value' }],
      ['disabledButtons', { watchDepth: 'reference' }],

      ['query', { watchDepth: 'reference' }],
      ['store', { watchDepth: 'reference' }],
      ['uiSettings', { watchDepth: 'reference' }],
      ['intl', { watchDepth: 'reference' }],
      ['store', { watchDepth: 'reference' }],

      ['onQuerySubmit', { watchDepth: 'reference' }],
      ['onFiltersUpdated', { watchDepth: 'reference' }],
      ['onRefreshChange', { watchDepth: 'reference' }],

      ['indexPatterns', { watchDepth: 'collection' }],
      ['filters', { watchDepth: 'collection' }],

      // All modifiers default to true.
      // Set to false to hide subcomponents.
      'showSearchBar',
      'showFilterBar',
      'showQueryBar',
      'showQueryInput',
      'showDatePicker',

      'appName',
      'screenTitle',
      'dateRangeFrom',
      'dateRangeTo',
      'isRefreshPaused',
      'refreshInterval',
      'disableAutoFocus',
      'showAutoRefreshOnly',
    ],
  );
});
