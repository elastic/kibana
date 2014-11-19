define(function (require) {
  // get the kibana/metric_vis module, and make sure that it requires the "kibana" module if it
  // didn't already
  var module = require('modules').get('kibana/metric_vis', ['kibana']);

  module.controller('KbnMetricVisController', function ($scope) {
    var metric = $scope.metric = {
      label: null,
      value: null
    };

    $scope.$watch('esResponse', function (resp) {
      if (!resp) {
        metric.label = metric.value = null;
      } else {
        var agg = $scope.vis.aggs[0];
        metric.label = agg.makeLabel();
        if (agg.type.name === 'count') metric.value = resp.hits.total;
        else metric.value = resp.aggregations[agg.id].value;
      }
    });
  });
});