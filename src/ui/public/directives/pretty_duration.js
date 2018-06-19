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

import { uiModules } from '../modules';
import { prettyDuration } from '../timepicker/pretty_duration';
const module = uiModules.get('kibana');

module.directive('prettyDuration', function (config) {
  return {
    restrict: 'E',
    scope: {
      from: '=',
      to: '='
    },
    link: function ($scope, $elem) {
      const getConfig = (...args) => config.get(...args);

      function setText(text) {
        $elem.text(text);
        $elem.attr('aria-label', `Current time range is ${text}`);
      }

      function stringify() {
        setText(prettyDuration($scope.from, $scope.to, getConfig));
      }

      $scope.$watch('from', stringify);
      $scope.$watch('to', stringify);

    }
  };
});
