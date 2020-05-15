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

import { decodeGeoHash } from './decode_geo_hash';
import { gridDimensions } from './grid_dimensions';

export function convertToGeoJson(tabifiedResponse, { geohash, geocentroid, metric }) {
  let features;
  let min = Infinity;
  let max = -Infinity;

  if (tabifiedResponse && tabifiedResponse.rows) {
    const table = tabifiedResponse;
    const geohashColumn = geohash ? table.columns[geohash.accessor] : null;

    if (!geohashColumn) {
      features = [];
    } else {
      const metricColumn = table.columns[metric.accessor];
      const geocentroidColumn = geocentroid ? table.columns[geocentroid.accessor] : null;

      features = table.rows
        .map(row => {
          const geohashValue = row[geohashColumn.id];
          if (!geohashValue) return false;
          const geohashLocation = decodeGeoHash(geohashValue);

          let pointCoordinates;
          if (geocentroidColumn) {
            const location = row[geocentroidColumn.id];
            pointCoordinates = [location.lon, location.lat];
          } else {
            pointCoordinates = [geohashLocation.longitude[2], geohashLocation.latitude[2]];
          }

          const rectangle = [
            [geohashLocation.latitude[0], geohashLocation.longitude[0]],
            [geohashLocation.latitude[0], geohashLocation.longitude[1]],
            [geohashLocation.latitude[1], geohashLocation.longitude[1]],
            [geohashLocation.latitude[1], geohashLocation.longitude[0]],
          ];

          const centerLatLng = [geohashLocation.latitude[2], geohashLocation.longitude[2]];

          if (geohash.params.useGeocentroid) {
            // see https://github.com/elastic/elasticsearch/issues/24694 for why clampGrid is used
            pointCoordinates[0] = clampGrid(
              pointCoordinates[0],
              geohashLocation.longitude[0],
              geohashLocation.longitude[1]
            );
            pointCoordinates[1] = clampGrid(
              pointCoordinates[1],
              geohashLocation.latitude[0],
              geohashLocation.latitude[1]
            );
          }

          const value = row[metricColumn.id];
          min = Math.min(min, value);
          max = Math.max(max, value);

          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: pointCoordinates,
            },
            properties: {
              geohash: geohashValue,
              geohash_meta: {
                center: centerLatLng,
                rectangle: rectangle,
              },
              value: value,
            },
          };
        })
        .filter(row => row);
    }
  } else {
    features = [];
  }

  const featureCollection = {
    type: 'FeatureCollection',
    features: features,
  };

  return {
    featureCollection: featureCollection,
    meta: {
      min: min,
      max: max,
      geohashPrecision: geohash && geohash.params.precision,
      geohashGridDimensionsAtEquator: geohash && gridDimensions(geohash.params.precision),
    },
  };
}

function clampGrid(val, min, max) {
  if (val > max) val = max;
  else if (val < min) val = min;
  return val;
}
