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
import { uiModules } from 'ui/modules';
import { FilterBar } from '../filter';
import { ApplyFiltersPopover } from '../filter';
import template from './directive.html';

// @ts-ignore
import { mapAndFlattenFilters } from '../filter/filter_manager/lib/map_and_flatten_filters';
// @ts-ignore

/** @internal */
export const initLegacyModule = once((): void => {
  uiModules
    .get('app/kibana')
    .directive('filterBar', (reactDirective: any) => {
      return reactDirective(wrapInI18nContext(FilterBar));
    })
    .directive('applyFiltersPopoverComponent', (reactDirective: any) => {
      return reactDirective(wrapInI18nContext(ApplyFiltersPopover));
    })
    .directive('applyFiltersPopover', (indexPatterns: any) => {
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
          $scope.$watch('filters', (filters: any) => {
            mapAndFlattenFilters(indexPatterns, filters).then((mappedFilters: Filter[]) => {
              $scope.state = {
                filters: mappedFilters,
                key: Date.now(),
              };
            });
          });
        },
      };
    });
});
