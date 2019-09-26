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

import $ from 'jquery';
import { uiModules } from 'ui/modules';
const module = uiModules.get('app/discover');

module.directive('kbnInfiniteScroll', function () {
  return {
    restrict: 'E',
    scope: {
      more: '='
    },
    link: function ($scope, $element) {
      const $window = $(window);
      let checkTimer;

      function onScroll() {
        if (!$scope.more) return;

        const winHeight = $window.height();
        const winBottom = winHeight + $window.scrollTop();
        const elTop = $element.offset().top;
        const remaining = elTop - winBottom;

        if (remaining <= winHeight * 0.50) {
          $scope[$scope.$$phase ? '$eval' : '$apply'](function () {
            $scope.more();
          });
        }
      }

      function scheduleCheck() {
        if (checkTimer) return;
        checkTimer = setTimeout(function () {
          checkTimer = null;
          onScroll();
        }, 50);
      }

      $window.on('scroll', scheduleCheck);
      $scope.$on('$destroy', function () {
        clearTimeout(checkTimer);
        $window.off('scroll', scheduleCheck);
      });
      scheduleCheck();
    }
  };
});
