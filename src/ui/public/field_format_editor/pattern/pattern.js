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

import '../samples/samples';
import { uiModules } from '../../modules';
import patternTemplate from './pattern.html';

uiModules
  .get('kibana')
  .directive('fieldFormatEditorPattern', function () {
    return {
      restrict: 'E',
      replace: true,
      template: patternTemplate,
      require: ['ngModel', '^fieldEditor'],
      scope: true,
      link: function ($scope, $el, attrs, cntrls) {
        const ngModelCntrl = cntrls[0];

        $scope.$bind('inputs', attrs.inputs);
        $scope.$bind('placeholder', attrs.placeholder);
        attrs.$observe('id', () => $scope.id = attrs.id);

        // bind our local model with the outside ngModel
        $scope.$watch('model', v => ngModelCntrl.$setViewValue(v));
        ngModelCntrl.$render = function () {
          $scope.model = ngModelCntrl.$viewValue;
        };
      }
    };
  });
