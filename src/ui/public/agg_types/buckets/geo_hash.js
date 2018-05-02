import _ from 'lodash';
import { AggTypesBucketsBucketAggTypeProvider } from './_bucket_agg_type';
import { AggConfig } from '../../vis/agg_config';
import precisionTemplate from '../controls/precision.html';
import { geohashColumns } from '../../utils/decode_geo_hash';
import { geoContains, scaleBounds } from '../../utils/geo_utils';

export function AggTypesBucketsGeoHashProvider(Private, config) {
  const BucketAggType = Private(AggTypesBucketsBucketAggTypeProvider);

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

  function getMapZoom(vis) {
    if (vis.hasUiState() && parseInt(vis.uiStateVal('mapZoom')) >= 0) {
      return parseInt(vis.uiStateVal('mapZoom'));
    }

    return vis.params.mapZoom;
  }

  function isOutsideCollar(bounds, collar) {
    return bounds && collar && !geoContains(collar, bounds);
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
        name: 'isFilteredByCollar',
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
          const currZoom = getMapZoom(vis);
          const autoPrecisionVal = zoomPrecision[currZoom];
          output.params.precision = aggConfig.params.autoPrecision ? autoPrecisionVal : getPrecision(aggConfig.params.precision);
        }
      }
    ],
    getRequestAggs: function (agg) {
      const aggs = [];

      if (agg.params.isFilteredByCollar && agg.getField()) {
        const vis = agg.vis;
        const mapBounds = vis.sessionState.mapBounds;
        const mapZoom = getMapZoom(vis);
        if (mapBounds) {
          const lastMapCollar = vis.sessionState.mapCollar;
          let mapCollar;
          if (!lastMapCollar || lastMapCollar.zoom !== mapZoom || isOutsideCollar(mapBounds, lastMapCollar)) {
            mapCollar = scaleBounds(mapBounds);
            mapCollar.zoom = mapZoom;
            vis.sessionState.mapCollar = mapCollar;
          } else {
            mapCollar = lastMapCollar;
          }
          const boundingBox = {};
          boundingBox[agg.getField().name] = {
            top_left: mapCollar.top_left,
            bottom_right: mapCollar.bottom_right
          };
          aggs.push(new AggConfig(agg.vis, {
            type: 'filter',
            id: 'filter_agg',
            enabled: true,
            params: {
              geo_bounding_box: boundingBox
            },
            schema: {
              group: 'buckets'
            }
          }));
        }
      }

      aggs.push(agg);

      if (agg.params.useGeocentroid) {
        aggs.push(new AggConfig(agg.vis, {
          type: 'geo_centroid',
          enabled: true,
          params: {
            field: agg.getField()
          },
          schema: 'metric'
        }));
      }

      return aggs;
    }
  });
}
