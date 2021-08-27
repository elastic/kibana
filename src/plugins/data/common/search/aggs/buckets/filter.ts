/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Query } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import { getEsQueryConfig } from '../../../es_query/get_es_query_config';
import type { GeoBoundingBox } from '../../expressions/geo_bounding_box';
import { geoBoundingBoxToAst } from '../../expressions/geo_bounding_box_to_ast';
import type { QueryFilter } from '../../expressions/query_filter';
import { queryToAst } from '../../expressions/query_to_ast';
import type { BaseAggParams } from '../types';
import { BucketAggType } from './bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { aggFilterFnName } from './filter_fn';

const filterTitle = i18n.translate('data.search.aggs.buckets.filterTitle', {
  defaultMessage: 'Filter',
});

export interface AggParamsFilter extends BaseAggParams {
  geo_bounding_box?: GeoBoundingBox;
  filter?: QueryFilter;
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
        toExpressionAst: geoBoundingBoxToAst,
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
        toExpressionAst: queryToAst,
      },
    ],
  });
