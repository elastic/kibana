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
import { Filter } from '@kbn/es-query';

// @ts-ignore
import { uiModules } from 'ui/modules';
import { npSetup, npStart } from 'ui/new_platform';
import { FilterBar, ApplyFiltersPopover } from '../filter';
import template from './apply_filter_directive.html';

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
          child.setAttribute('http', 'http');

          // Append helper directive
          elem.append(child);

          const linkFn = ($scope: any) => {
            $scope.uiSettings = npSetup.core.uiSettings;
            $scope.http = npSetup.core.http;
          };

          return linkFn;
        },
      };
    })
    .directive('filterBarHelper', (reactDirective: any) => {
      return reactDirective(wrapInI18nContext(FilterBar), [
        ['uiSettings', { watchDepth: 'reference' }],
        ['http', { watchDepth: 'reference' }],
        ['onFiltersUpdated', { watchDepth: 'reference' }],
        ['indexPatterns', { watchDepth: 'collection' }],
        ['filters', { watchDepth: 'collection' }],
        ['className', { watchDepth: 'reference' }],
      ]);
    })
    .directive('applyFiltersPopoverComponent', (reactDirective: any) =>
      reactDirective(wrapInI18nContext(ApplyFiltersPopover))
    )
    .directive('applyFiltersPopover', (indexPatterns: IndexPatterns) => {
      return {
        template,
        restrict: 'E',
        scope: {
          filters: '=',
          onCancel: '=',
          onSubmit: '=',
        },
        link($scope: any) {
          $scope.state = {};

          // Each time the new filters change we want to rebuild (not just re-render) the "apply filters"
          // popover, because it has to reset its state whenever the new filters change. Setting a `key`
          // property on the component accomplishes this due to how React handles the `key` property.
          $scope.$watch('filters', async (filters: any) => {
            const mappedFilters: Filter[] = await mapAndFlattenFilters(indexPatterns, filters);
            $scope.state = {
              filters: mappedFilters,
              key: Date.now(),
            };
          });
        },
      };
    });

  const module = uiModules.get('kibana/index_patterns');
  let _service: any;
  module.service('indexPatterns', function(chrome: any) {
    if (!_service)
      _service = new IndexPatterns(
        npStart.core.uiSettings,
        npStart.core.savedObjects.client,
        npStart.core.http
      );
    return _service;
  });
});
