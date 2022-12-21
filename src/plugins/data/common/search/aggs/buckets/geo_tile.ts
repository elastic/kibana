/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';

import { BucketAggType, IBucketAggConfig } from './bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { aggGeoTileFnName } from './geo_tile_fn';
import { KBN_FIELD_TYPES } from '../../..';
import { METRIC_TYPES } from '../metrics/metric_agg_types';
import { BaseAggParams } from '../types';

const geotileGridTitle = i18n.translate('data.search.aggs.buckets.geotileGridTitle', {
  defaultMessage: 'Geotile',
});

export interface AggParamsGeoTile extends BaseAggParams {
  field: string;
  useGeocentroid?: boolean;
  precision?: number;
}

export const getGeoTitleBucketAgg = () =>
  new BucketAggType({
    name: BUCKET_TYPES.GEOTILE_GRID,
    expressionName: aggGeoTileFnName,
    title: geotileGridTitle,
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: KBN_FIELD_TYPES.GEO_POINT,
      },
      {
        name: 'useGeocentroid',
        default: true,
        write: noop,
      },
      {
        name: 'precision',
        default: 0,
      },
    ],
    getRequestAggs(agg) {
      const aggs = [];
      const useGeocentroid = agg.getParam('useGeocentroid');

      aggs.push(agg);

      if (useGeocentroid) {
        const aggConfig = {
          type: METRIC_TYPES.GEO_CENTROID,
          enabled: true,
          params: {
            field: agg.getField(),
          },
        };

        aggs.push(agg.aggConfigs.createAggConfig(aggConfig, { addToAggConfigs: false }));
      }

      return aggs as IBucketAggConfig[];
    },
  });
