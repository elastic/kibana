define(function (require) {
  var k4d3 = require('k4d3');
  var $ = require('jquery');

  function VisualizationDirective(createNotifier) {
    return {
      restrict: 'E',
      template: '<pre class="chart">{{ data | json }}</pre>',
      scope: {
        vis: '='
      },
      link: function ($scope, $el) {
        var vis = $scope.vis;
        var notify = createNotifier({
          location: vis.type + ' visualization'
        });

        vis.searchSource.onResults().then(function onResults(resp) {
          notify.event('render visualization');
          $scope.data = vis.buildChartDataFromResponse(resp);
          notify.event('render visualization', true);

          window.canvasVisSource = vis.searchSource;
          return vis.searchSource.onResults().then(onResults);
        }).catch(notify.fatal);
      }
    };
  }

  require('modules').get('kibana/directive')
    .directive('visualization', VisualizationDirective);
});