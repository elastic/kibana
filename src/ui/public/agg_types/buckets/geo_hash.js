import _ from 'lodash';
import AggTypesBucketsBucketAggTypeProvider from 'ui/agg_types/buckets/_bucket_agg_type';
import precisionTemplate from 'ui/agg_types/controls/precision.html';
import { geohashColumns } from 'ui/utils/decode_geo_hash';
import zoomToPrecision from 'ui/utils/zoom_to_precision';

export default function GeoHashAggDefinition(Private, config) {
  const BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);
  const defaultPrecision = 2;
  const maxPrecision = parseInt(config.get('visualization:tileMap:maxPrecision'), 10) || 12;

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
          let currZoom;
          if (vis.hasUiState()) {
            currZoom = parseInt(vis.uiStateVal('mapZoom'), 10);
          }


          const autoPrecisionVal = currZoom >= 0 ? zoomToPrecision(currZoom, maxPrecision) : zoomToPrecision(parseInt(vis.params.mapZoom), maxPrecision);
          output.params.precision = aggConfig.params.autoPrecision ? autoPrecisionVal : getPrecision(aggConfig.params.precision);
        }
      }
    ]
  });
}
