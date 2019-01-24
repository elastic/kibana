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

import 'angular-ui-select';
import { uiModules } from '../modules';
import { getFilterableFields } from './lib/filter_editor_utils';
import template from './filter_field_select.html';
import '../directives/ui_select_focus_on';
import '../directives/scroll_bottom';
import '../filters/sort_prefix_first';

const module = uiModules.get('kibana');
module.directive('filterFieldSelect', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      indexPatterns: '=',
      field: '=',
      onSelect: '&'
    },
    link: function ($scope) {
      $scope.$watch('indexPatterns', (indexPatterns) => {
        $scope.fieldOptions = getFilterableFields(indexPatterns);
      });

      $scope.getFieldIndexPattern = (field) => {
        return field.indexPattern.title;
      };

      $scope.increaseLimit = () => $scope.limit += 50;
      $scope.resetLimit = () => $scope.limit = 50;
      $scope.resetLimit();
    }
  };
});
