require('ui/modules')
.get('apps/discover')
.directive('discoverTimechart', function (Private, $compile) {
  var _ = require('lodash');
  var $ = require('jquery');
  var vislib = Private(require('ui/vislib'));

  return {
    restrict: 'E',
    scope : {
      data: '='
    },
    link: function ($scope, elem) {

      var init = function () {
        // This elem should already have a height/width
        var myChart = new vislib.Chart(elem[0], {

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
