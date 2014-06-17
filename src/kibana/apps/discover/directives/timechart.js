define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var k4 = require('k4d3');

  var app = require('modules').get('apps/discover');

  app.directive('discoverTimechart', function ($compile) {
    return {
      restrict: 'E',
      scope : {
        data: '='
      },
      link: function ($scope, elem) {

        var init = function () {
          // This elem should already have a height/width
          var myChart = new k4.Chart(elem[0], {

          });

          $scope.$watch('data', function (data) {
            if (data != null) {
              myChart.render(data);
            }
          });
        };

        // Start the directive
        init();
      }
    };
  });

});