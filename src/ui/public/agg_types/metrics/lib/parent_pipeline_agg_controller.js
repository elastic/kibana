import _ from 'lodash';

const parentPipelineAggController = function ($scope) {

  $scope.safeMakeLabel = function (agg) {
    try {
      return agg.makeLabel();
    } catch (e) {
      return '- agg not valid -';
    }
  };

  $scope.$watch('responseValueAggs', updateOrderAgg);
  $scope.$watch('agg.params.metricAgg', updateOrderAgg);

  $scope.$on('$destroy', function () {
    if ($scope.aggForm && $scope.aggForm.agg) {
      $scope.aggForm.agg.$setValidity('bucket', true);
    }
  });

  $scope.rejectAgg = function (agg) {
    const invalidAggs = ['top_hits', 'percentiles', 'percentile_ranks', 'median', 'std_dev'];
    return Boolean(invalidAggs.find(invalidAgg => invalidAgg === agg.type.name));
  };

  function checkBuckets() {
    const lastBucket = _.findLast($scope.vis.aggs, agg => agg.schema.group === 'buckets');
    const bucketHasType = lastBucket && lastBucket.type;
    const bucketIsHistogram = bucketHasType && ['date_histogram', 'histogram'].includes(lastBucket.type.name);
    const canUseAggregation = lastBucket && bucketIsHistogram;
    if ($scope.aggForm.agg) $scope.aggForm.agg.$setValidity('bucket', canUseAggregation);
    if (canUseAggregation) {
      if (lastBucket.type.name === 'histogram') {
        lastBucket.params.min_doc_count = 1;
      }
      else {
        lastBucket.params.min_doc_count = 0;
      }
    }
  }

  function updateOrderAgg() {
    const agg = $scope.agg;
    const params = agg.params;
    const metricAgg = params.metricAgg;
    const paramDef = agg.type.params.byName.customMetric;

    checkBuckets();

    // we aren't creating a custom aggConfig
    if (metricAgg !== 'custom') {
      if (!$scope.vis.aggs.find(agg => agg.id === metricAgg)) {
        params.metricAgg = null;
      }
      params.customMetric = null;
      return;
    }

    params.customMetric = params.customMetric || paramDef.makeAgg(agg);
  }
};

export { parentPipelineAggController };
