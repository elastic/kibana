define(function (require) {
  var k4d3 = require('k4d3');
  var $ = require('jquery');

  require('css!../styles/visualization.css');

  var module = require('modules').get('kibana/directive');

  module.directive('visualize', function (createNotifier, SavedVis) {
    return {
      restrict: 'E',
      link: function ($scope, $el) {
        var chart; // set in "vis" watcher

        function onHover(event) {
          console.log(event);
        }

        $scope.$watch('vis', function (vis, prevVis) {
          if (prevVis && prevVis.destroy) prevVis.destroy();
          if (chart) chart.destroy();
          if (!(vis instanceof SavedVis)) return;

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

        $el.on('hover', onHover);
        $el.on('click', onHover);
        // $el.on('hover', onHover);

        $scope.$on('$destroy', function () {
          if ($scope.vis) $scope.vis.destroy();
          $el.off('hover', onHover);
          $el.off('click', onHover);
        });
      }
    };
  });
});