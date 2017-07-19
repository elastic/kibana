import { safeMakeLabel } from './safe_make_label';

const siblingPipelineAggController = function (type) {
  return function ($scope) {

    $scope.aggType = type;
    $scope.aggTitle = type === 'customMetric' ? 'Metric' : 'Bucket';
    $scope.aggGroup = type === 'customMetric' ? 'metrics' : 'buckets';
    $scope.safeMakeLabel = safeMakeLabel;

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
