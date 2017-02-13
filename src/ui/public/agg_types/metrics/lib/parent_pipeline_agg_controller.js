import _ from 'lodash';
import safeMakeLabel from './safe_make_label';

const parentPipelineAggController = function ($scope) {

  $scope.safeMakeLabel = safeMakeLabel;

  $scope.$watch('responseValueAggs', updateOrderAgg);
  $scope.$watch('agg.params.metricAgg', updateOrderAgg);

  $scope.$on('$destroy', function () {
    if ($scope.aggForm && $scope.aggForm.agg) {
      $scope.aggForm.agg.$setValidity('bucket', true);
    }
  });

  $scope.isDisabledAgg = function (agg) {
    const invalidAggs = ['top_hits', 'percentiles', 'percentile_ranks', 'median', 'std_dev'];
    return Boolean(invalidAggs.find(invalidAgg => invalidAgg === agg.type.name));
  };

  function checkBuckets() {
    const lastBucket = _.findLast($scope.vis.aggs, agg => agg.schema.group === 'buckets');
    const bucketHasType = lastBucket && lastBucket.type;
    const bucketIsHistogram = bucketHasType && ['date_histogram', 'histogram'].includes(lastBucket.type.name);
    const canUseAggregation = lastBucket && bucketIsHistogram;

    // remove errors on all buckets
    _.each($scope.vis.aggs, agg => { if (agg.error) delete agg.error; });

    if ($scope.aggForm.agg) {
      $scope.aggForm.agg.$setValidity('bucket', canUseAggregation);
    }
    if (canUseAggregation) {
      lastBucket.params.min_doc_count = (lastBucket.type.name === 'histogram') ? 1 : 0;
    } else {
      if (lastBucket) {
        const type = $scope.agg.type.title;
        lastBucket.error = `Last bucket aggregation must be "Date Histogram" or 
        "Histogram" when using "${type}" metric aggregation!`;
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
