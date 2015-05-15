define(function (require) {
  return function GeoHashAggDefinition(Private, config) {
    var _ = require('lodash');
    var moment = require('moment');
    var BucketAggType = Private(require('components/agg_types/buckets/_bucket_agg_type'));
    var defaultPrecision = 2;

    function getPrecision(precision) {
      var maxPrecision = _.parseInt(config.get('visualization:tileMap:maxPrecision'));

      precision = parseInt(precision, 10);

      if (isNaN(precision)) {
        precision = defaultPrecision;
      }

      if (precision > maxPrecision) {
        return maxPrecision;
      }

      return precision;
    }

    return new BucketAggType({
      name: 'geohash_grid',
      title: 'Geohash',
      params: [
        {
          name: 'field',
          filterFieldTypes: 'geo_point'
        },
        {
          name: 'precision',
          default: defaultPrecision,
          editor: require('text!components/agg_types/controls/precision.html'),
          controller: function ($scope) {
            $scope.$watch('editableVis.params.autoPrecision', function (auto, prev) {
              if (auto === prev) return;
              if (auto) return;

              var precision = _.get($scope.editableVis, 'clonedFrom.aggs.byTypeName.geohash_grid[0].params.precision');
              if (precision) {
                _.each($scope.editableVis.aggs.byTypeName.geohash_grid, function (agg) {
                  agg.params.precision = precision;
                });
              }
            });
          },
          deserialize: getPrecision,
          write: function (aggConfig, output) {
            output.params.precision = getPrecision(aggConfig.params.precision);
          }
        }
      ]
    });
  };
});
