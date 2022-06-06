/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getGeoHashBucketAgg } from './geo_hash';
import { AggConfigs, IAggConfigs } from '../agg_configs';
import { mockAggTypesRegistry } from '../test_helpers';
import { BUCKET_TYPES } from './bucket_agg_types';
import { BucketAggType, IBucketAggConfig } from './bucket_agg_type';

describe('Geohash Agg', () => {
  let geoHashBucketAgg: BucketAggType;

  beforeEach(() => {
    geoHashBucketAgg = getGeoHashBucketAgg();
  });

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
      {
        typesRegistry: mockAggTypesRegistry(),
      },
      jest.fn()
    );
  };

  describe('precision parameter', () => {
    const PRECISION_PARAM_INDEX = 2;

    let precisionParam: any;

    beforeEach(() => {
      precisionParam = geoHashBucketAgg.params[PRECISION_PARAM_INDEX];
    });

    test('should select precision parameter', () => {
      expect(precisionParam.name).toEqual('precision');
    });
  });

  test('produces the expected expression ast', () => {
    const aggConfigs = getAggConfigs();
    expect(aggConfigs.aggs[0].toExpressionAst()).toMatchInlineSnapshot(`
      Object {
        "chain": Array [
          Object {
            "arguments": Object {
              "autoPrecision": Array [
                true,
              ],
              "enabled": Array [
                true,
              ],
              "field": Array [
                "location",
              ],
              "id": Array [
                "geohash_grid",
              ],
              "isFilteredByCollar": Array [
                true,
              ],
              "precision": Array [
                2,
              ],
              "schema": Array [
                "segment",
              ],
              "useGeocentroid": Array [
                true,
              ],
            },
            "function": "aggGeoHash",
            "type": "function",
          },
        ],
        "type": "expression",
      }
    `);
  });

  describe('getRequestAggs', () => {
    describe('initial aggregation creation', () => {
      let aggConfigs: IAggConfigs;
      let geoHashGridAgg: IBucketAggConfig;

      beforeEach(() => {
        aggConfigs = getAggConfigs();
        geoHashGridAgg = aggConfigs.aggs[0] as IBucketAggConfig;
      });

      test('should create filter, geohash_grid, and geo_centroid aggregations', () => {
        const requestAggs = geoHashBucketAgg.getRequestAggs(geoHashGridAgg) as IBucketAggConfig[];

        expect(requestAggs.length).toEqual(3);
        expect(requestAggs[0].type.name).toEqual('filter');
        expect(requestAggs[1].type.name).toEqual('geohash_grid');
        expect(requestAggs[2].type.name).toEqual('geo_centroid');
      });
    });
  });

  describe('aggregation options', () => {
    test('should only create geohash_grid and geo_centroid aggregations when isFilteredByCollar is false', () => {
      const aggConfigs = getAggConfigs({ isFilteredByCollar: false });
      const requestAggs = geoHashBucketAgg.getRequestAggs(
        aggConfigs.aggs[0] as IBucketAggConfig
      ) as IBucketAggConfig[];

      expect(requestAggs.length).toEqual(2);
      expect(requestAggs[0].type.name).toEqual('geohash_grid');
      expect(requestAggs[1].type.name).toEqual('geo_centroid');
    });

    test('should only create filter and geohash_grid aggregations when useGeocentroid is false', () => {
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

    test('should change geo_bounding_box filter aggregation and vis session state when map movement is outside map collar', () => {
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

    test('should not change geo_bounding_box filter aggregation and vis session state when map movement is within map collar', () => {
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
