define(function (require) {
  var k4d3 = require('k4d3');
  var $ = require('jquery');

  require('css!../styles/visualization.css');

  var module = require('modules').get('kibana/directive');

  module.directive('visualize', function (createNotifier) {
    return {
      restrict: 'E',
      link: function ($scope, $el) {
        var chart; // set in "vis" watcher

        $scope.$watch('vis', function (vis, prevVis) {
          if (prevVis) prevVis.destroy();
          if (chart) chart.destroy();
          if (!vis) return;

          var notify = createNotifier({
            location: vis.typeName + ' visualization'
          });

          chart = new k4d3.Chart($el[0], {
            type: vis.typeName
          });

          vis.searchSource.onResults(function onResults(resp) {
            try {
              chart.render(vis.buildChartDataFromResponse(resp));
            } catch (e) {
              notify.error(e);
            }
          }).catch(notify.fatal);

          $scope.$root.$broadcast('ready:vis');
        });

        $scope.$on('$destroy', function () {
          if ($scope.vis) $scope.vis.destroy();
        });
      }
    };
  });
});