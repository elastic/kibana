/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import $ from 'jquery';

export function initTimelionGridDirective(app) {
  app.directive('timelionGrid', function () {
    return {
      restrict: 'A',
      scope: {
        timelionGridRows: '=',
        timelionGridColumns: '=',
      },
      link: function ($scope, $elem) {
        function init() {
          setDimensions();
        }

        $scope.$on('$destroy', function () {
          $(window).off('resize'); //remove the handler added earlier
        });

        $(window).resize(function () {
          setDimensions();
        });

        $scope.$watchMulti(['timelionGridColumns', 'timelionGridRows'], function () {
          setDimensions();
        });

        function setDimensions() {
          const borderSize = 2;
          const headerSize = 45 + 35 + 28 + 20 * 2; // chrome + subnav + buttons + (container padding)
          const verticalPadding = 10;

          if ($scope.timelionGridColumns != null) {
            $elem.width($elem.parent().width() / $scope.timelionGridColumns - borderSize * 2);
          }

          if ($scope.timelionGridRows != null) {
            $elem.height(
              ($(window).height() - headerSize) / $scope.timelionGridRows -
                (verticalPadding + borderSize * 2)
            );
          }
        }

        init();
      },
    };
  });
}
