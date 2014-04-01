define(function (require) {
  var converters = require('../resp_converters/index');
  // var K4D3 = require('K4D3');

  function VisualizationDirective() {
    return {
      restrict: 'E',
      template: '<div class="chart"><pre>{{ results | json }}</pre></div>',
      scope: {
        vis: '='
      },
      link: function ($scope, $el) {
        var vis = $scope.vis;

        vis
          .dataSource
          .on('results', function (resp) {
            $scope.results = vis.buildChartDataFromResponse(resp);
          });

        if (!vis.dataSource._$scope) {
          // only link if the dataSource isn't already linked
          vis.dataSource.$scope($scope);
        }
      }
    };
  }

  require('modules').get('kibana/directive')
    .directive('visualization', VisualizationDirective);
});