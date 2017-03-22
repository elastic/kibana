import AggResponseTabifyTabifyProvider from 'ui/agg_response/tabify/tabify';
import uiModules from 'ui/modules';
// get the kibana/metric_vis module, and make sure that it requires the "kibana" module if it
// didn't already
const module = uiModules.get('kibana/metric_vis', ['kibana']);

module.controller('KbnMetricVisController', function ($scope, $element, Private) {
  const tabifyAggResponse = Private(AggResponseTabifyTabifyProvider);

  const metrics = $scope.metrics = [];

  $scope.processTableGroups = function (tableGroups) {
    tableGroups.tables.forEach(function (table) {
      table.columns.forEach(function (column, i) {
        const value = table.rows[0][i];

        metrics.push({
          label: column.title,
          value: value.toString('html')
        });
      });
    });
  };

  $scope.$watch('esResponse', function (resp) {
    if (resp) {
      const options = {
        asAggConfigResults: true
      };

      metrics.length = 0;
      $scope.processTableGroups(tabifyAggResponse($scope.vis, resp, options));
      $element.trigger('renderComplete');
    }
  });
});
