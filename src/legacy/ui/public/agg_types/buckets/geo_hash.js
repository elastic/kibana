/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import chrome from '../../chrome';
import { BucketAggType } from './_bucket_agg_type';
import { AutoPrecisionParamEditor } from '../controls/auto_precision';
import { UseGeocentroidParamEditor } from '../controls/use_geocentroid';
import { IsFilteredByCollarParamEditor } from '../controls/is_filtered_by_collar';
import { PrecisionParamEditor } from '../controls/precision';
import { geohashColumns } from '../../utils/decode_geo_hash';
import { geoContains, scaleBounds } from '../../utils/geo_utils';
import { i18n } from '@kbn/i18n';

const config = chrome.getUiSettingsClient();

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

function isOutsideCollar(bounds, collar) {
  return bounds && collar && !geoContains(collar, bounds);
}

export const geoHashBucketAgg = new BucketAggType({
  name: 'geohash_grid',
  title: i18n.translate('common.ui.aggTypes.buckets.geohashGridTitle', {
    defaultMessage: 'Geohash',
  }),
  params: [
    {
      name: 'field',
      type: 'field',
      filterFieldTypes: 'geo_point'
    },
    {
      name: 'autoPrecision',
      editorComponent: AutoPrecisionParamEditor,
      default: true,
      write: () => {},
    },
    {
      name: 'precision',
      editorComponent: PrecisionParamEditor,
      default: defaultPrecision,
      deserialize: getPrecision,
      write: function (aggConfig, output) {
        const currZoom = aggConfig.params.mapZoom;
        const autoPrecisionVal = zoomPrecision[currZoom];
        output.params.precision = aggConfig.params.autoPrecision ?
          autoPrecisionVal : getPrecision(aggConfig.params.precision);
      }
    },
    {
      name: 'useGeocentroid',
      editorComponent: UseGeocentroidParamEditor,
      default: true,
      write: () => {},
    },
    {
      name: 'isFilteredByCollar',
      editorComponent: IsFilteredByCollarParamEditor,
      default: true,
      write: () => {},
    },
    {
      name: 'mapZoom',
      default: 2,
      write: () => {},
    },
    {
      name: 'mapCenter',
      default: [0, 0],
      write: () => {},
    },
    {
      name: 'mapBounds',
      default: null,
      write: () => {},
    }
  ],
  getRequestAggs: function (agg) {
    const aggs = [];
    const params = agg.params;

    if (params.isFilteredByCollar && agg.getField()) {
      const { mapBounds, mapZoom } = params;
      if (mapBounds) {
        let mapCollar;
        if (!agg.lastMapCollar || agg.lastMapCollar.zoom !== mapZoom || isOutsideCollar(mapBounds, agg.lastMapCollar)) {
          mapCollar = scaleBounds(mapBounds);
          mapCollar.zoom = mapZoom;
          agg.lastMapCollar = mapCollar;
        } else {
          mapCollar = agg.lastMapCollar;
        }
        const boundingBox = {
          ignore_unmapped: true,
          [agg.getField().name]: {
            top_left: mapCollar.top_left,
            bottom_right: mapCollar.bottom_right
          }
        };
        aggs.push(agg.aggConfigs.createAggConfig({
          type: 'filter',
          id: 'filter_agg',
          enabled: true,
          params: {
            geo_bounding_box: boundingBox
          },
          schema: {
            group: 'buckets'
          }
        },  { addToAggConfigs: false }));
      }
    }

    aggs.push(agg);

    if (params.useGeocentroid) {
      aggs.push(agg.aggConfigs.createAggConfig({
        type: 'geo_centroid',
        enabled: true,
        params: {
          field: agg.getField()
        }
      }, { addToAggConfigs: false }));
    }

    return aggs;
  }
});
