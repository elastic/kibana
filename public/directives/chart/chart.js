var panelRegistryProvider = require('plugins/timelion/lib/panel_registry');

require('ui/modules')
.get('apps/timelion', [])
.directive('chart', function (Private) {
  return {
    restrict: 'A',
    scope: {
      seriesList: '=chart', // The flot object, data, config and all
      search: '=', // The function to execute to kick off a search
      interval: '=' // Required for formatting x-axis ticks
    },
    link: function ($scope, $elem) {

      var panelRegistry = Private(panelRegistryProvider);
      var panelScope = $scope.$new(true);

      function render(seriesList) {
        panelScope.$destroy();

        console.log($scope.seriesList);

        if (!seriesList) return;

        var renderer = 'timechart';

        var panelSchema = panelRegistry.byName[renderer];
        var panelConfig = {
          chart: seriesList.list,
          interval: $scope.interval,
          search: $scope.search
        };
        panelScope = $scope.$new(true);
        panelSchema.render(panelScope, $elem, panelConfig);
      }

      $scope.$watch('seriesList', render);
    }
  };
});
