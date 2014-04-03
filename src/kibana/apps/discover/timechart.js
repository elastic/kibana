define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var k4 = require('K4D3');

  var app = require('modules').get('app/discover');

  app.directive('discoverTimechart', function ($compile) {
    return {
      restrict: 'E',
      scope : {
        data: '='
      },
      link: function ($scope, elem) {

        console.log($scope.data);

        var init = function () {
          // This elem should already have a height/width
          var myChart = new k4.Chart(elem[0], {
            type: 'histogram',
            stacktype: 'zero',
            yGroup: true,
            color: ['#81dfe2', '#0762b7']
          });

          $scope.$watch('data', function (data) {
            return;
            //if (!_.isUndefined(data)) {
            //  myChart.render(data);
            //}
          });


          elem.css({height: 100});
        };

        // Start the directive
        init();
      }
    };
  });

});