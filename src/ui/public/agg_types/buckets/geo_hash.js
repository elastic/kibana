import _ from 'lodash';
import moment from 'moment';
import AggTypesBucketsBucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import precisionTemplate from 'ui/agg_types/controls/precision.html';
export default function GeoHashAggDefinition(Private, config) {
  let BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  let defaultPrecision = 2;

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
        editor: precisionTemplate,
        deserialize: getPrecision,
        controller: function ($scope) {
        },
        write: function (aggConfig, output) {
          const vis = aggConfig.vis;
          const currZoom = vis.hasUiState() && vis.uiStateVal('mapZoom');
          const autoPrecisionVal = zoomPrecision[(currZoom || vis.params.mapZoom)];
          output.params.precision = aggConfig.params.autoPrecision ? autoPrecisionVal : getPrecision(aggConfig.params.precision);
        }
      }
    ]
  });
};
