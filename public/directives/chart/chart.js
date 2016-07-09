var panelRegistryProvider = require('plugins/timelion/lib/panel_registry');

require('ui/modules')
.get('apps/timelion', [])
.directive('chart', function (Private) {
  return {
    restrict: 'A',
    scope: {
      chart: '=', // The flot object, data, config and all
      search: '=', // The function to execute to kick off a search
      interval: '=' // Required for formatting x-axis ticks
    },
    link: function ($scope, $elem) {

      var panelRegistry = Private(panelRegistryProvider);
      var panelScope = $scope.$new(true);

      function render(chart) {
        panelScope.$destroy();

        if (!chart) return;
        chart.render = {
          type: 'timechart'
        };

        var panelSchema = panelRegistry.byName[chart.render.type];
        var panelConfig = {
          chart: chart,
          interval: $scope.interval,
          search: $scope.search
        };
        panelScope = $scope.$new(true);
        panelSchema.render(panelScope, $elem, panelConfig);
      }

      $scope.$watch('chart', render);
    }
  };
});
