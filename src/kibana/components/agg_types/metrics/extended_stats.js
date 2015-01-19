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

    var statNames = [
      'count',
      'min',
      'max',
      'avg',
      'sum',
      'sum_of_squares',
      'variance',
      'std_deviation'
    ];

    var exStatsType = new MetricAggType({
      name: 'extended_stats',
      title: 'Extended Stats',
      makeLabel: function (agg) {
        return 'Extended Stats on ' + agg.fieldDisplayName();
      },
      params: [
        {
          name: 'field',
          filterFieldTypes: 'number'
        },
        {
          name: 'names',
          editor: require('text!components/agg_types/controls/extended_stats.html'),
          default: statNames.slice(),
          write: _.noop,
          controller: function ($scope) {
            $scope.map = mapList();
            $scope.names = listMap();
            $scope.statNames = statNames;

            $scope.$watchCollection('agg.params.names', function (names) {
              if (names === $scope.names) return;

              $scope.names = _.intersection(statNames, names || []);
              $scope.map = mapList();
            });

            $scope.$watchCollection('map', function () {
              $scope.names = $scope.agg.params.names = listMap();
            });

            function mapList() {
              return _.transform($scope.names, function (map, key) {
                map[key] = true;
              }, {});
            }

            function listMap() {
              return _.transform(statNames, function (list, stat) {
                if ($scope.map[stat]) list.push(stat);
              }, []);
            }
          }
        }
      ],
      getResponseAggs: function (agg) {
        var ValueAggConfig = getResponseAggConfig(agg, valueProps);
        return _.map(agg.params.names, function (name) {
          return new ValueAggConfig(name);
        });
      },
      getValue: function (agg, bucket) {
        return bucket[agg.parentId][agg.key];
      }
    });

    exStatsType.statNames = statNames;
    return exStatsType;
  };
});