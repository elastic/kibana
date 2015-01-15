define(function (require) {
  return function AggTypeMetricExtendedStatsProvider(Private) {
    var _ = require('lodash');
    var MetricAggType = Private(require('components/agg_types/metrics/_metric_agg_type'));
    var getResponseAggConfig = Private(require('components/agg_types/metrics/_get_response_agg_config'));

    var valueProps = {
      makeLabel: function () {
        return this.key + ' of ' + this.fieldDisplayName();
      }
    };

    return new MetricAggType({
      name: 'extended_stats',
      title: 'Extended Stats',
      makeLabel: function (agg) {
        return 'Extended Stats on ' + agg.fieldDisplayName();
      },
      params: [
        {
          name: 'field'
        },
        {
          name: 'metrics',
          editor: require('text!components/agg_types/controls/extended_stats_metrics.html'),
          default: [
            'count',
            'min',
            'max',
            'avg',
            'sum',
            'sum_of_squares',
            'variance',
            'std_deviation'
          ],
          write: _.noop,
          controller: function ($scope) {
            $scope.$bind('metrics', 'agg.type.params.byName.metrics.default');

            $scope.values = arrayToObj($scope.agg.params.metrics || []);
            $scope.$watchCollection('values', function () {
              $scope.agg.params.metrics = objToArray($scope.values);
            });

            function objToArray(obj) {
              return _.transform($scope.metrics, function (keys, key) {
                if (obj[key]) keys.push(key);
              }, []);
            }

            function arrayToObj(arr) {
              return _.transform(arr, function (presence, value) {
                return presence[value] = true;
              }, {});
            }
          }
        }
      ],
      getResponseAggs: function (agg) {
        var ValueAggConfig = getResponseAggConfig(agg, valueProps);
        return _.map(agg.params.metrics, function (name) {
          return new ValueAggConfig(name);
        });
      },
      getValue: function (agg, bucket) {
        return bucket[agg.parentId][agg.key];
      }
    });
  };
});