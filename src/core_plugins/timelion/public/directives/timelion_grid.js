const _ = require('lodash');
const $ = require('jquery');

const app = require('ui/modules').get('apps/timelion', []);
app.directive('timelionGrid', function ($compile) {
  return {
    restrict: 'A',
    scope: {
      timelionGridRows: '=',
      timelionGridColumns: '='
    },
    link: function ($scope, $elem, attrs) {

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
        const headerSize = 45 + 35 + 28 + (20 * 2); // chrome + subnav + buttons + (container padding)
        const verticalPadding = 10;

        if ($scope.timelionGridColumns != null) {
          $elem.width($elem.parent().width() / $scope.timelionGridColumns - (borderSize * 2));
        }

        if ($scope.timelionGridRows != null) {
          $elem.height(($(window).height() - headerSize) / $scope.timelionGridRows - (verticalPadding + borderSize * 2));
        }
      }

      init();


    }
  };
});
