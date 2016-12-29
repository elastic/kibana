const _ = require('lodash');

const module = require('ui/modules').get('vectormap');

module.controller('VectormapController', function ($scope) {
  $scope.$watch('esResponse', function (resp) {
    if (!resp || !resp.aggregations) {
      $scope.data = null;
      return;
    }

    const geoCodeAggId = _.first(_.pluck($scope.vis.aggs.bySchemaName.segment, 'id'));
    const metricsAgg = _.first($scope.vis.aggs.bySchemaName.metric);
    const buckets = resp.aggregations[geoCodeAggId] && resp.aggregations[geoCodeAggId].buckets;

    $scope.data = {};

    buckets.forEach(function (bucket) {
      const prefix = $scope.vis.params.mapType === 'us_aea' ? 'US-' : '';
      $scope.data[prefix + bucket.key.toUpperCase()] = metricsAgg.getValue(bucket);
    });
  });
});
