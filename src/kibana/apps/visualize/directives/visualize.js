define(function (require) {
  var k4d3 = require('k4d3');
  var $ = require('jquery');

  require('css!../styles/visualization.css');

  var module = require('modules').get('kibana/directive');

  module.directive('visualize', function (createNotifier) {
    return {
      restrict: 'E',
      link: function ($scope, $el) {
        $scope.$watch('vis', function (vis, prevVis) {
          if (prevVis) prevVis.destroy();
          if (!vis) return;

          var notify = createNotifier({
            location: vis.type + ' visualization'
          });

          vis.searchSource.onResults(function onResults(resp) {
            var $disp = $('<pre>');
            $disp.text(JSON.stringify(vis.buildChartDataFromResponse(resp), null, '  '));
            $el.html($disp);
          });

          $scope.$root.$broadcast('ready:vis');
        });
      }
    };
  });
});