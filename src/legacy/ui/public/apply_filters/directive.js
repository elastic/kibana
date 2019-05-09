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
import { uiModules } from '../modules';
import template from './directive.html';
import { ApplyFiltersPopover } from './apply_filters_popover';
import { mapAndFlattenFilters } from '../filter_bar/lib/map_and_flatten_filters';
import { wrapInI18nContext } from 'ui/i18n';

const app = uiModules.get('app/kibana', ['react']);

app.directive('applyFiltersPopoverComponent', (reactDirective) => {
  return reactDirective(wrapInI18nContext(ApplyFiltersPopover));
});

app.directive('applyFiltersPopover', (indexPatterns) => {
  return {
    template,
    restrict: 'E',
    scope: {
      filters: '=',
      onCancel: '=',
      onSubmit: '=',
    },
    link: function ($scope) {
      $scope.state = {};

      // Each time the new filters change we want to rebuild (not just re-render) the "apply filters"
      // popover, because it has to reset its state whenever the new filters change. Setting a `key`
      // property on the component accomplishes this due to how React handles the `key` property.
      $scope.$watch('filters', filters => {
        mapAndFlattenFilters(indexPatterns, filters).then(mappedFilters => {
          $scope.state = {
            filters: mappedFilters,
            key: Date.now(),
          };
        });
      });
    }
  };
});
