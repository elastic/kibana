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
import { getOperatorOptions } from './lib/filter_editor_utils';
import template from './filter_operator_select.html';
import '../directives/ui_select_focus_on';

const module = uiModules.get('kibana');
module.directive('filterOperatorSelect', function () {
  return {
    restrict: 'E',
    template,
    scope: {
      field: '=',
      operator: '=',
      onSelect: '&'
    },
    link: function ($scope) {
      $scope.$watch('field', (field) => {
        $scope.operatorOptions = getOperatorOptions(field);
      });
    }
  };
});
