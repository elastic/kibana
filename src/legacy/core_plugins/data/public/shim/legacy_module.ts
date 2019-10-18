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

import { once } from 'lodash';

import { wrapInI18nContext } from 'ui/i18n';

// @ts-ignore
import { uiModules } from 'ui/modules';
import { npStart } from 'ui/new_platform';
import { FilterBar, ApplyFiltersPopover } from '../filter';

// @ts-ignore
import { mapAndFlattenFilters } from '../filter/filter_manager/lib/map_and_flatten_filters';
import { IndexPatterns } from '../index_patterns/index_patterns';

/** @internal */
export const initLegacyModule = once((): void => {
  uiModules
    .get('app/kibana', ['react'])
    .directive('filterBar', () => {
      return {
        restrict: 'E',
        template: '',
        compile: (elem: any) => {
          const child = document.createElement('filter-bar-helper');

          // Copy attributes to the child directive
          for (const attr of elem[0].attributes) {
            child.setAttribute(attr.name, attr.value);
          }

          child.setAttribute('ui-settings', 'uiSettings');
          child.setAttribute('doc-links', 'docLinks');
          child.setAttribute('plugin-data-start', 'pluginDataStart');

          // Append helper directive
          elem.append(child);

          const linkFn = ($scope: any) => {
            $scope.uiSettings = npStart.core.uiSettings;
            $scope.docLinks = npStart.core.docLinks;
            $scope.pluginDataStart = npStart.plugins.data;
          };

          return linkFn;
        },
      };
    })
    .directive('filterBarHelper', (reactDirective: any) => {
      return reactDirective(wrapInI18nContext(FilterBar), [
        ['uiSettings', { watchDepth: 'reference' }],
        ['docLinks', { watchDepth: 'reference' }],
        ['onFiltersUpdated', { watchDepth: 'reference' }],
        ['indexPatterns', { watchDepth: 'collection' }],
        ['filters', { watchDepth: 'collection' }],
        ['className', { watchDepth: 'reference' }],
        ['pluginDataStart', { watchDepth: 'reference' }],
      ]);
    })
    .directive('applyFiltersPopover', () => {
      return {
        restrict: 'E',
        template: '',
        compile: (elem: any) => {
          const child = document.createElement('apply-filters-popover-helper');

          // Copy attributes to the child directive
          for (const attr of elem[0].attributes) {
            child.setAttribute(attr.name, attr.value);
          }

          // Add a key attribute that will force a full rerender every time that
          // a filter changes.
          child.setAttribute('key', 'key');

          // Append helper directive
          elem.append(child);

          const linkFn = ($scope: any, _: any, $attr: any) => {
            // Watch only for filter changes to update key.
            $scope.$watch(
              () => {
                return $scope.$eval($attr.filters) || [];
              },
              (newVal: any) => {
                $scope.key = Date.now();
              },
              true
            );
          };

          return linkFn;
        },
      };
    })
    .directive('applyFiltersPopoverHelper', (reactDirective: any) =>
      reactDirective(wrapInI18nContext(ApplyFiltersPopover), [
        ['filters', { watchDepth: 'collection' }],
        ['onCancel', { watchDepth: 'reference' }],
        ['onSubmit', { watchDepth: 'reference' }],
        ['indexPatterns', { watchDepth: 'collection' }],

        // Key is needed to trigger a full rerender of the component
        'key',
      ])
    );

  const module = uiModules.get('kibana/index_patterns');
  let _service: any;
  module.service('indexPatterns', function() {
    if (!_service)
      _service = new IndexPatterns(
        npStart.core.uiSettings,
        npStart.core.savedObjects.client,
        npStart.core.http,
        npStart.core.notifications
      );
    return _service;
  });
});
