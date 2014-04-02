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

        elem.css({width:1000,height:300});

        console.log($scope.data);

        var data = {
          rows: [
            {
              columns: [
                {
                  label: 'Events',
                  xAxisLabel: 'Month',
                  yAxisLabel: 'Hits',
                  layers: [
                    {
                      key: 'somekey',
                      values: [
                        {x: 'Jan', 'y': 270},
                        {x: 'Feb', 'y': 329},
                        {x: 'Mar', 'y': 166},
                        {x: 'Apr', 'y': 271},
                        {x: 'May', 'y': 185},
                        {x: 'Jun', 'y': 264}
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        };


        var init = function () {
          // This elem should already have a height/width
          var myChart = new k4.Chart(elem[0], {
            type: 'histogram',
            stacktype: 'expand',
            yGroup: true,
            color: ['#81dfe2', '#0762b7']
          });

          myChart.render(data);
        };

        // Start the directive
        init();
      }
    };
  });

});