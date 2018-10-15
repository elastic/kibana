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

import _ from 'lodash';
import { uiModules } from 'ui/modules';
import { callAfterBindingsWorkaround } from 'ui/compat';
import contextSizePickerTemplate from './size_picker.html';

const module = uiModules.get('apps/context', [
  'kibana',
]);

module.directive('contextSizePicker', function ContextSizePicker() {
  return {
    bindToController: true,
    controller: callAfterBindingsWorkaround(ContextSizePickerController),
    controllerAs: 'contextSizePicker',
    link: linkContextSizePicker,
    replace: true,
    restrict: 'E',
    require: 'ngModel',
    scope: {
      count: '=',
      isDisabled: '=',
      onChangeCount: '=',  // To avoid inconsistent ngModel states this action
      // should make sure the new value is propagated back
      // to the `count` property. If that propagation
      // fails, the user input will be reset to the value
      // of `count`.
    },
    template: contextSizePickerTemplate,
  };
});

function linkContextSizePicker(scope, element, attrs, ngModel) {
  scope.countModel = ngModel;
}

function ContextSizePickerController($scope) {
  $scope.$watch(
    () => this.count,
    () => $scope.countModel.$rollbackViewValue(),
  );

  this.getOrSetCount = (count) => (
    _.isUndefined(count) ? this.count : this.onChangeCount(count)
  );
}
