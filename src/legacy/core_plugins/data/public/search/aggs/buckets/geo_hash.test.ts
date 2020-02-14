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

import { geoHashBucketAgg } from './geo_hash';
import { AggConfigs, IAggConfigs } from '../agg_configs';
import { BUCKET_TYPES } from './bucket_agg_types';
import { IBucketAggConfig } from './_bucket_agg_type';

jest.mock('ui/new_platform');

describe('Geohash Agg', () => {
  const getAggConfigs = (params?: Record<string, any>) => {
    const indexPattern = {
      id: '1234',
      title: 'logstash-*',
      fields: {
        getByName: () => field,
        filter: () => [field],
      },
    } as any;

    const field = {
      name: 'location',
      indexPattern,
    };

    return new AggConfigs(
      indexPattern,
      [
        {
          id: BUCKET_TYPES.GEOHASH_GRID,
          type: BUCKET_TYPES.GEOHASH_GRID,
          schema: 'segment',
          params: {
            field: {
              name: 'location',
            },
            isFilteredByCollar: true,
            useGeocentroid: true,
            mapZoom: 10,
            mapBounds: {
              top_left: { lat: 1.0, lon: -1.0 },
              bottom_right: { lat: -1.0, lon: 1.0 },
            },
            ...params,
          },
        },
      ],
      null
    );
  };

  describe('precision parameter', () => {
    const PRECISION_PARAM_INDEX = 2;

    let precisionParam: any;

    beforeEach(() => {
      precisionParam = geoHashBucketAgg.params[PRECISION_PARAM_INDEX];
    });

    it('should select precision parameter', () => {
      expect(precisionParam.name).toEqual('precision');
    });
  });

  describe('getRequestAggs', () => {
    describe('initial aggregation creation', () => {
      let aggConfigs: IAggConfigs;
      let geoHashGridAgg: IBucketAggConfig;

      beforeEach(() => {
        aggConfigs = getAggConfigs();
        geoHashGridAgg = aggConfigs.aggs[0] as IBucketAggConfig;
      });

      it('should create filter, geohash_grid, and geo_centroid aggregations', () => {
        const requestAggs = geoHashBucketAgg.getRequestAggs(geoHashGridAgg) as IBucketAggConfig[];

        expect(requestAggs.length).toEqual(3);
        expect(requestAggs[0].type.name).toEqual('filter');
        expect(requestAggs[1].type.name).toEqual('geohash_grid');
        expect(requestAggs[2].type.name).toEqual('geo_centroid');
      });
    });
  });

  describe('aggregation options', () => {
    it('should only create geohash_grid and geo_centroid aggregations when isFilteredByCollar is false', () => {
      const aggConfigs = getAggConfigs({ isFilteredByCollar: false });
      const requestAggs = geoHashBucketAgg.getRequestAggs(
        aggConfigs.aggs[0] as IBucketAggConfig
      ) as IBucketAggConfig[];

      expect(requestAggs.length).toEqual(2);
      expect(requestAggs[0].type.name).toEqual('geohash_grid');
      expect(requestAggs[1].type.name).toEqual('geo_centroid');
    });

    it('should only create filter and geohash_grid aggregations when useGeocentroid is false', () => {
      const aggConfigs = getAggConfigs({ useGeocentroid: false });
      const requestAggs = geoHashBucketAgg.getRequestAggs(
        aggConfigs.aggs[0] as IBucketAggConfig
      ) as IBucketAggConfig[];

      expect(requestAggs.length).toEqual(2);
      expect(requestAggs[0].type.name).toEqual('filter');
      expect(requestAggs[1].type.name).toEqual('geohash_grid');
    });
  });

  describe('aggregation creation after map interaction', () => {
    let originalRequestAggs: IBucketAggConfig[];

    beforeEach(() => {
      originalRequestAggs = geoHashBucketAgg.getRequestAggs(
        getAggConfigs({
          boundingBox: {
            top_left: { lat: 1, lon: -1 },
            bottom_right: { lat: -1, lon: 1 },
          },
        }).aggs[0] as IBucketAggConfig
      ) as IBucketAggConfig[];
    });

    it('should change geo_bounding_box filter aggregation and vis session state when map movement is outside map collar', () => {
      const [, geoBoxingBox] = geoHashBucketAgg.getRequestAggs(
        getAggConfigs({
          boundingBox: {
            top_left: { lat: 10.0, lon: -10.0 },
            bottom_right: { lat: 9.0, lon: -9.0 },
          },
        }).aggs[0] as IBucketAggConfig
      ) as IBucketAggConfig[];

      expect(originalRequestAggs[1].params).not.toEqual(geoBoxingBox.params);
    });

    it('should not change geo_bounding_box filter aggregation and vis session state when map movement is within map collar', () => {
      const [, geoBoxingBox] = geoHashBucketAgg.getRequestAggs(
        getAggConfigs({
          boundingBox: {
            top_left: { lat: 1, lon: -1 },
            bottom_right: { lat: -1, lon: 1 },
          },
        }).aggs[0] as IBucketAggConfig
      ) as IBucketAggConfig[];

      expect(originalRequestAggs[1].params).toEqual(geoBoxingBox.params);
    });
  });
});
