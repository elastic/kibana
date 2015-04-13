define(function (require) {
  return function AggTypeMetricPercentileRanksProvider(Private) {
    var _ = require('lodash');

    var MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));
    var getResponseAggConfig = Private(require('components/agg_types/metrics/_get_response_agg_config'));

    require('components/agg_types/controls/_values_list');
    var valuesEditor = require('text!components/agg_types/controls/values.html');

    var valueProps = {
      makeLabel: function () {
        return 'Percentile rank ' + this.key + ' of "' + this.fieldDisplayName() + '"';
      }
    };

    return new MetricAggType({
      name: 'percentile_ranks',
      title: 'Percentile Ranks',
      makeLabel: function (agg) {
        return 'Percentile ranks of ' + agg.fieldDisplayName();
      },
      params: [
        {
          name: 'field',
          filterFieldTypes: 'number'
        },
        {
          name: 'values',
          editor: valuesEditor,
          default: [],
          controller: function ($scope) {
            $scope.remove = function (index) {
              $scope.agg.params.values.splice(index, 1);
            };

            $scope.add = function () {
              $scope.agg.params.values.push(_.last($scope.agg.params.values) + 1);
            };

            $scope.$watchCollection('agg.params.values', function (values) {
              $scope.validLength = _.size(values) || null;
            });
          }
        }
      ],
      getResponseAggs: function (agg) {
        var ValueAggConfig = getResponseAggConfig(agg, valueProps);

        return agg.params.values.map(function (value) {
          return new ValueAggConfig(value);
        });
      },
      getValue: function (agg, bucket) {
        // values for 1, 5, and 10 will come back as 1.0, 5.0, and 10.0 so we
        // parse the keys and respond with the value that matches
        return _.find(bucket[agg.parentId].values, function (value, key) {
          return agg.key === parseFloat(key);
        });
      }
    });
  };
});