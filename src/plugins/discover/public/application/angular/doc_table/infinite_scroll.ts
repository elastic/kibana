/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
