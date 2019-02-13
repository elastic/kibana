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
import { uiModules } from '../../../modules';

uiModules
  .get('app/visualize')
  .directive('visAggParamEditor', function (config) {
    return {
      restrict: 'E',
      scope: true,
      template: function ($el) {
        return $el.html();
      },
      link: {
        pre: function ($scope, $el, attr) {
          $scope.$bind('aggParam', attr.aggParam);
        },
        post: function ($scope) {
          $scope.config = config;

          $scope.optionEnabled = function (option) {
            if (option && _.isFunction(option.enabled)) {
              return option.enabled($scope.agg);
            }

            return true;
          };
        }
      }
    };
  });
