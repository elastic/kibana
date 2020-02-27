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

import { i18n } from '@kbn/i18n';
import { BucketAggType, IBucketAggConfig } from './_bucket_agg_type';
import { KBN_FIELD_TYPES } from '../../../../../../../plugins/data/public';
import { BUCKET_TYPES } from './bucket_agg_types';

const defaultBoundingBox = {
  top_left: { lat: 1, lon: 1 },
  bottom_right: { lat: 0, lon: 0 },
};

const defaultPrecision = 2;

const geohashGridTitle = i18n.translate('data.search.aggs.buckets.geohashGridTitle', {
  defaultMessage: 'Geohash',
});

export const geoHashBucketAgg = new BucketAggType<IBucketAggConfig>({
  name: BUCKET_TYPES.GEOHASH_GRID,
  title: geohashGridTitle,
  params: [
    {
      name: 'field',
      type: 'field',
      filterFieldTypes: KBN_FIELD_TYPES.GEO_POINT,
    },
    {
      name: 'autoPrecision',
      default: true,
      write: () => {},
    },
    {
      name: 'precision',
      default: defaultPrecision,
      write(aggConfig, output) {
        output.params.precision = aggConfig.params.precision;
      },
    },
    {
      name: 'useGeocentroid',
      default: true,
      write: () => {},
    },
    {
      name: 'isFilteredByCollar',
      default: true,
      write: () => {},
    },
    {
      name: 'boundingBox',
      default: null,
      write: () => {},
    },
  ],
  getRequestAggs(agg) {
    const aggs = [];
    const params = agg.params;

    if (params.isFilteredByCollar && agg.getField()) {
      aggs.push(
        agg.aggConfigs.createAggConfig(
          {
            type: 'filter',
            id: 'filter_agg',
            enabled: true,
            params: {
              geo_bounding_box: {
                ignore_unmapped: true,
                [agg.getField().name]: params.boundingBox || defaultBoundingBox,
              },
            },
          } as any,
          { addToAggConfigs: false }
        )
      );
    }

    aggs.push(agg);

    if (params.useGeocentroid) {
      aggs.push(
        agg.aggConfigs.createAggConfig(
          {
            type: 'geo_centroid',
            enabled: true,
            params: {
              field: agg.getField(),
            },
          },
          { addToAggConfigs: false }
        )
      );
    }

    return aggs;
  },
});
