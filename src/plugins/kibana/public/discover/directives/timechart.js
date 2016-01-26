require('ui/modules')
.get('apps/discover')
.directive('discoverTimechart', function (Private, $compile) {
  const _ = require('lodash');
  const $ = require('jquery');
  const vislib = Private(require('ui/vislib'));

  return {
    restrict: 'E',
    scope : {
      data: '='
    },
    link: function ($scope, elem) {

      const init = function () {
        // This elem should already have a height/width
        const myChart = new vislib.Chart(elem[0], {

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
