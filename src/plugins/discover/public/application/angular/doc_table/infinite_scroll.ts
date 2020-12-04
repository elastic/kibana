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

interface LazyScope extends ng.IScope {
  [key: string]: any;
}

export function createInfiniteScrollDirective() {
  return {
    restrict: 'E',
    scope: {
      more: '=',
    },
    link: ($scope: LazyScope, $element: JQuery) => {
      let checkTimer: any;
      /**
       * depending on which version of Discover is displayed, different elements are scrolling
       * and have therefore to be considered for calculation of infinite scrolling
       */
      const scrollDiv = $element.parents('.dscTable');
      const scrollDivMobile = $(window);

      function onScroll() {
        if (!$scope.more) return;
        const isMobileView = document.getElementsByClassName('dscSidebar__mobile').length > 0;
        const usedScrollDiv = isMobileView ? scrollDivMobile : scrollDiv;
        const scrollTop = usedScrollDiv.scrollTop();

        const winHeight = Number(usedScrollDiv.height());
        const winBottom = Number(winHeight) + Number(scrollTop);
        const elTop = $element.get(0).offsetTop || 0;
        const remaining = elTop - winBottom;

        if (remaining <= winHeight) {
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

      scrollDiv.on('scroll', scheduleCheck);
      window.addEventListener('scroll', scheduleCheck);
      $scope.$on('$destroy', function () {
        clearTimeout(checkTimer);
        scrollDiv.off('scroll', scheduleCheck);
        window.removeEventListener('scroll', scheduleCheck);
      });
      scheduleCheck();
    },
  };
}
