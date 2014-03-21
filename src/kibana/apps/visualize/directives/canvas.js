define(function (require) {
  var module = require('modules').get('app/visualize');
  var $ = require('jquery');

  module.directive('visCanvas', function () {
    return {
      restrict: 'A',
      link: function ($scope, $el) {
        var $window = $(window);
        var $header = $('.content > nav.navbar:first()');

        function stretchVis() {
          $el.css('height', $window.height() - $header.height() - 30);
        }

        stretchVis();

        $window.on('resize', stretchVis);
        $scope.$on('$destroy', function () {
          $window.off('resize', stretchVis);
        });
      }
    };
  });
});