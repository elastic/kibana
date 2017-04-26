import _ from 'lodash';
import { AggTypesBucketsBucketAggTypeProvider } from 'ui/agg_types/buckets/_bucket_agg_type';
import { VisAggConfigProvider } from 'ui/vis/agg_config';
import precisionTemplate from 'ui/agg_types/controls/precision.html';
import { geohashColumns } from 'ui/utils/decode_geo_hash';

export function AggTypesBucketsGeoHashProvider(Private, config) {
  const BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  const AggConfig = Private(VisAggConfigProvider);

  const defaultPrecision = 2;
  const maxPrecision = parseInt(config.get('visualization:tileMap:maxPrecision'), 10) || 12;
  /**
   * Map Leaflet zoom levels to geohash precision levels.
   * The size of a geohash column-width on the map should be at least `minGeohashPixels` pixels wide.
   */
  const zoomPrecision = {};
  const minGeohashPixels = 16;
  for (let zoom = 0; zoom <= 21; zoom += 1) {
    const worldPixels = 256 * Math.pow(2, zoom);
    zoomPrecision[zoom] = 1;
    for (let precision = 2; precision <= maxPrecision; precision += 1) {
      const columns = geohashColumns(precision);
      if ((worldPixels / columns) >= minGeohashPixels) {
        zoomPrecision[zoom] = precision;
      } else {
        break;
      }
    }
  }

  function getPrecision(precision) {

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
        name: 'useGeocentroid',
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
        default: defaultPrecision,
        deserialize: getPrecision,
        controller: function () {
        },
        write: function (aggConfig, output) {
          const vis = aggConfig.vis;
          let currZoom;
          if (vis.hasUiState()) {
            currZoom = parseInt(vis.uiStateVal('mapZoom'), 10);
          }
          const autoPrecisionVal = zoomPrecision[currZoom >= 0 ? currZoom : parseInt(vis.params.mapZoom)];
          output.params.precision = aggConfig.params.autoPrecision ? autoPrecisionVal : getPrecision(aggConfig.params.precision);
        }
      }
    ],
    getRequestAggs: function (agg) {
      if (!agg.params.useGeocentroid) {
        return agg;
      }

      /**
       * By default, add the geo_centroid aggregation
       */
      return [agg, new AggConfig(agg.vis, {
        type: 'geo_centroid',
        enabled:true,
        params: {
          field: agg.getField()
        },
        schema: 'metric'
      })];
    }
  });
}
