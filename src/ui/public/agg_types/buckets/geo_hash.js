define(function (require) {
  return function GeoHashAggDefinition(Private, config) {
    let _ = require('lodash');
    let moment = require('moment');
    let BucketAggType = Private(require('ui/agg_types/buckets/_bucket_agg_type'));
    let defaultPrecision = 2;

    function getPrecision(precision) {
      let maxPrecision = _.parseInt(config.get('visualization:tileMap:maxPrecision'));

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
          name: 'autoPrecision',
          default: true,
          write: _.noop
        },
        {
          name: 'mapZoom',
          write: _.noop
        },
        {
          name: 'mapCenter',
          write: _.noop
        },
        {
          name: 'precision',
          default: defaultPrecision,
          editor: require('ui/agg_types/controls/precision.html'),
          controller: function ($scope) {
            $scope.$watchMulti([
              'agg.params.autoPrecision',
              'outputAgg.params.precision'
            ], function (cur, prev) {
              if (cur[1]) $scope.agg.params.precision = cur[1];
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
