define(function (require) {
  var k4d3 = require('k4d3');
  var $ = require('jquery');

  require('css!../styles/visualization.css');

  var module = require('modules').get('kibana/directive');
  var chart; // set in "vis" watcher

  module.directive('visualize', function (createNotifier) {
    return {
      restrict: 'E',
      link: function ($scope, $el) {
        $scope.$watch('vis', function (vis, prevVis) {
          if (prevVis) prevVis.destroy();
          if (chart) chart.destroy();
          if (!vis) return;

          var notify = createNotifier({
            location: vis.type + ' visualization'
          });

          chart = new k4d3.Chart($el[0], {
            type: 'histogram'
          });

          vis.searchSource.onResults(function onResults(resp) {
            chart.render(vis.buildChartDataFromResponse(resp));
          });

          $scope.$root.$broadcast('ready:vis');
        });

        $scope.$on('$destroy', function () {
          if ($scope.vis) $scope.vis.destroy();
        });
      }
    };
  });
});