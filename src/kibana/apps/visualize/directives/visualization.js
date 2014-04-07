define(function (require) {
  var converters = require('../resp_converters/index');
  // var K4D3 = require('K4D3');

  function VisualizationDirective(createNotifier) {
    return {
      restrict: 'E',
      template: '<div class="chart"><pre>{{ results | json }}</pre></div>',
      scope: {
        vis: '='
      },
      link: function ($scope, $el) {
        var vis = $scope.vis;

        var notify = createNotifier({
          location: vis.type + ' visualization'
        });

        vis.dataSource.onResults().then(function onResults(resp) {
          $scope.results = vis.buildChartDataFromResponse(resp);
          return vis.dataSource.onResults(onResults);
        }).catch(notify.fatal);
      }
    };
  }

  require('modules').get('kibana/directive')
    .directive('visualization', VisualizationDirective);
});