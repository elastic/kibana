define(function (require) {
  return function AggTypeMetricPercentilesProvider(Private) {
    var _ = require('lodash');

    var MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));
    var getResponseAggConfig = Private(require('components/agg_types/metrics/_get_response_agg_config'));
    var ordinalSuffix = require('utils/ordinal_suffix');

    require('components/agg_types/controls/_values_list');
    var percentEditor = require('text!components/agg_types/controls/percents.html');

    var valueProps = {
      makeLabel: function () {
        return ordinalSuffix(this.key) + ' percentile of ' + this.fieldDisplayName();
      }
    };

    return new MetricAggType({
      name: 'percentiles',
      title: 'Percentiles',
      makeLabel: function (agg) {
        return 'Percentiles of ' + agg.fieldDisplayName();
      },
      params: [
        {
          name: 'field',
          filterFieldTypes: 'number'
        },
        {
          name: 'percents',
          editor: percentEditor,
          default: [1, 5, 25, 50, 75, 95, 99],
          controller: function ($scope) {
            $scope.remove = function (index) {
              $scope.agg.params.percents.splice(index, 1);
            };

            $scope.add = function () {
              $scope.agg.params.percents.push(_.last($scope.agg.params.percents) + 1);
            };

            $scope.$watchCollection('agg.params.percents', function (percents) {
              $scope.validLength = _.size(percents) || null;
            });
          }
        }
      ],
      getResponseAggs: function (agg) {
        var ValueAggConfig = getResponseAggConfig(agg, valueProps);

        return agg.params.percents.map(function (percent) {
          return new ValueAggConfig(percent);
        });
      },
      getValue: function (agg, bucket) {
        // percentiles for 1, 5, and 10 will come back as 1.0, 5.0, and 10.0 so we
        // parse the keys and respond with the value that matches
        return _.find(bucket[agg.parentId].values, function (value, key) {
          return agg.key === parseFloat(key);
        });
      }
    });
  };
});