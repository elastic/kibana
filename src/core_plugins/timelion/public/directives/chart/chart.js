import panelRegistryProvider from 'plugins/timelion/lib/panel_registry';

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

      const panelRegistry = Private(panelRegistryProvider);
      let panelScope = $scope.$new(true);

      function render(seriesList) {
        panelScope.$destroy();

        if (!seriesList) return;

        seriesList.render = seriesList.render || {
          type: 'timechart'
        };

        const panelSchema = panelRegistry.byName[seriesList.render.type];

        if (!panelSchema) {
          $elem.text('No such panel type: ' + seriesList.render.type);
          return;
        }

        panelScope = $scope.$new(true);
        panelScope.seriesList = seriesList;
        panelScope.interval = $scope.interval;
        panelScope.search = $scope.search;

        panelSchema.render(panelScope, $elem);
      }

      $scope.$watch('seriesList', render);
    }
  };
});
