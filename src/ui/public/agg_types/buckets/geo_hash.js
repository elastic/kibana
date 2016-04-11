import _ from 'lodash';
import moment from 'moment';
import AggTypesBucketsBucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import precisionTemplate from 'ui/agg_types/controls/precision.html';
export default function GeoHashAggDefinition(Private, config) {
  var BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  var defaultPrecision = 2;

  // zoomPrecision maps event.zoom to a geohash precision value
  // event.limit is the configurable max geohash precision
  // default max precision is 7, configurable up to 12
  const zoomPrecision = {
    1: 2,
    2: 2,
    3: 2,
    4: 3,
    5: 3,
    6: 4,
    7: 4,
    8: 5,
    9: 5,
    10: 6,
    11: 6,
    12: 7,
    13: 7,
    14: 8,
    15: 9,
    16: 10,
    17: 11,
    18: 12
  };

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
          $scope.$watchGroup([
          'agg.params.mapZoom',
          'agg.params.autoPrecision'],
          function (curr, prev) {
            const zoom = curr[0];
            const autoPrecision = curr[1];
            if (autoPrecision) {
              $scope.agg.params.precision = zoomPrecision[zoom];
            }
          });
          $scope.$watch('agg.params.precision', function(precision) {
            // $scope.uiState.set('mapPrecision', preci
          });

          $scope.agg.params.mapZoom = $scope.uiState.get('vis.params.mapZoom');
        },
        deserialize: getPrecision,
        write: function (aggConfig, output) {
          output.params.precision = getPrecision(aggConfig.params.precision);
        }
      }
    ]
  });
};
