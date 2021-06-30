/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import { i18n } from '@kbn/i18n';
import { buildEsQuery, Query } from '@kbn/es-query';
import { BucketAggType } from './bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { GeoBoundingBox } from './lib/geo_point';
import { aggFilterFnName } from './filter_fn';
import { BaseAggParams } from '../types';
import { getEsQueryConfig } from '../../../es_query';

const filterTitle = i18n.translate('data.search.aggs.buckets.filterTitle', {
  defaultMessage: 'Filter',
});

export interface AggParamsFilter extends BaseAggParams {
  geo_bounding_box?: GeoBoundingBox;
}

export const getFilterBucketAgg = ({ getConfig }: { getConfig: <T = any>(key: string) => any }) =>
  new BucketAggType({
    name: BUCKET_TYPES.FILTER,
    expressionName: aggFilterFnName,
    title: filterTitle,
    makeLabel: () => filterTitle,
    params: [
      {
        name: 'geo_bounding_box',
      },
      {
        name: 'filter',
        write(aggConfig, output) {
          const filter: Query = aggConfig.params.filter;

          const input = cloneDeep(filter);

          if (!input) {
            return;
          }

          const esQueryConfigs = getEsQueryConfig({ get: getConfig });
          const query = buildEsQuery(aggConfig.getIndexPattern(), [input], [], esQueryConfigs);

          if (!query) {
            console.log('malformed filter agg params, missing "query" on input'); // eslint-disable-line no-console
            return;
          }

          output.params = query;
        },
      },
    ],
  });
