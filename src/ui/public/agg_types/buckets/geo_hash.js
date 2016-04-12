import _ from 'lodash';
import moment from 'moment';
import AggTypesBucketsBucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import precisionTemplate from 'ui/agg_types/controls/precision.html';
export default function GeoHashAggDefinition(Private, config) {
  var BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);

  var defaultPrecision = 2;
  const zoomToPrecision = {
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

  function getAutoPrecision(agg) {
    const zoom = _.parseInt(agg.getUiStateValue('mapZoom'));
    if (zoomToPrecision.hasOwnProperty(zoom)) {
      return zoomToPrecision[zoom];
    } else {
      return defaultPrecision;
    }
  }

  function readPrecision(agg) {
    const max = _.parseInt(config.get('visualization:tileMap:maxPrecision'));
    const param = _.parseInt(agg.params.precision);
    return Math.min(isNaN(param) ? defaultPrecision : param, max);
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
        name: 'precision',
        default: defaultPrecision,
        editor: precisionTemplate,
        controller($scope) {
          $scope.$watchMulti([
            'agg.params.autoPrecision',
            'outputAgg.params.precision'
          ], function (cur, prev) {
            if (cur[1]) $scope.agg.params.precision = cur[1];
          });
        },
        write(agg, output) {
          const { autoPrecision } = agg.params;
          const shouldAuto = autoPrecision && agg.hasUiState();
          output.params.precision = shouldAuto ? getAutoPrecision(agg) : readPrecision(agg);
        }
      }
    ]
  });
};
