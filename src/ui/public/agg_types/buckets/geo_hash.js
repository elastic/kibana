import _ from 'lodash';
import AggTypesBucketsBucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import precisionTemplate from 'ui/agg_types/controls/precision.html';
import {geohashColumns, geohashRows} from 'ui/utils/decode_geo_hash';

export default function GeoHashAggDefinition(Private, config) {
  let BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  let defaultPrecision = 2;


  /**
   * Map Leaflet zoom levels to geohash precision levels.
   * The size of a geohash grid on the map should be at least `minGeohashSizeInPixels` pixels wide.
   */
  let zoomPrecision = {};
  const minGeohashPixels = 16;
  for (let zoom = 0; zoom <= 21; zoom += 1) {
    const worldPixels = 256 * Math.pow(2, zoom);
    zoomPrecision[zoom] = 1;
    for (let precision = 2; precision <= 12; precision += 1) {
      const cellsHorizontally = geohashColumns(precision, 0);
      const cellsVertically = geohashRows(precision, 1);
      const min = Math.min(worldPixels / cellsHorizontally, worldPixels / cellsVertically);
      if (min >= minGeohashPixels) {
        zoomPrecision[zoom] = precision;
      } else {
        break;
      }
    }
  }

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
