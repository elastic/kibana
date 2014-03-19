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

        var init = function () {
          /*
          // This elem should already have a height/width
          var myChart = new k4.Chart(elem, {type: 'timechart', doSomething: true, draggable: false});

          myChart.on('hover', function (elem, event) {
          })
          */


          //myChart.render($scope.data);
        };

        // Start the directive
        init();
      }
    };
  });

});