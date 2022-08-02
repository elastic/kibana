/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { GeoBoundingBox, geoBoundingBoxToAst } from '../../expressions';

import { BucketAggType, IBucketAggConfig } from './bucket_agg_type';
import { KBN_FIELD_TYPES } from '../../..';
import { BUCKET_TYPES } from './bucket_agg_types';
import { aggGeoHashFnName } from './geo_hash_fn';
import { BaseAggParams } from '../types';

const defaultBoundingBox = {
  top_left: { lat: 1, lon: 1 },
  bottom_right: { lat: 0, lon: 0 },
};

const defaultPrecision = 2;

const geohashGridTitle = i18n.translate('data.search.aggs.buckets.geohashGridTitle', {
  defaultMessage: 'Geohash',
});

export interface AggParamsGeoHash extends BaseAggParams {
  field: string;
  autoPrecision?: boolean;
  precision?: number;
  useGeocentroid?: boolean;
  isFilteredByCollar?: boolean;
  boundingBox?: GeoBoundingBox;
}

export const getGeoHashBucketAgg = () =>
  new BucketAggType<IBucketAggConfig>({
    name: BUCKET_TYPES.GEOHASH_GRID,
    expressionName: aggGeoHashFnName,
    title: geohashGridTitle,
    makeLabel: () => geohashGridTitle,
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
        toExpressionAst: geoBoundingBoxToAst,
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
