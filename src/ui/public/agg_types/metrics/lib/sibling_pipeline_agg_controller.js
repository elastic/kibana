import safeMakeLabel from './safe_make_label';

const siblingPipelineAggController = function (type) {
  return function ($scope) {

    $scope.aggType = type;
    //$scope.aggParam = $scope.agg.params[type];
    $scope.aggTitle = type === 'customMetric' ? 'Metric' : 'Bucket';
    $scope.aggGroup = type === 'customMetric' ? 'metrics' : 'buckets';
    $scope.safeMakeLabel = safeMakeLabel;

    $scope.rejectAgg = function (agg) {
      const invalidAggs = ['top_hits', 'percentiles', 'percentile_ranks', 'median', 'std_dev'];
      return Boolean(invalidAggs.find(agg.type.name));
    };

    //$scope.$watch(`agg.params.${type}`, updateAgg);

    function updateAgg() {
      const agg = $scope.agg;
      const params = agg.params;
      const paramDef = agg.type.params.byName[type];

      params[type] = params[type] || paramDef.makeAgg(agg);
    }

    updateAgg();
  };
};

export { siblingPipelineAggController };
