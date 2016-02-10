import _ from 'lodash';
import moment from 'moment';
import AggTypesBucketsBucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import precisionTemplate from 'ui/agg_types/controls/precision.html';
export default function GeoHashAggDefinition(Private, config) {
  var BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
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
        editor: precisionTemplate,
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
