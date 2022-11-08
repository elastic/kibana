/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { size, transform, cloneDeep } from 'lodash';
import { buildEsQuery, Query } from '@kbn/es-query';

import { QueryFilter, queryFilterToAst } from '../../expressions';
import { createFilterFilters } from './create_filter/filters';
import { BucketAggType } from './bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { aggFiltersFnName } from './filters_fn';
import { getEsQueryConfig, UI_SETTINGS } from '../../../../common';
import { BaseAggParams } from '../types';

const filtersTitle = i18n.translate('data.search.aggs.buckets.filtersTitle', {
  defaultMessage: 'Filters',
  description:
    'The name of an aggregation, that allows to specify multiple individual filters to group data by.',
});

interface FilterValue {
  input: Query;
  label: string;
  id: string;
}

export interface FiltersBucketAggDependencies {
  getConfig: <T = any>(key: string) => any;
}

export interface AggParamsFilters extends Omit<BaseAggParams, 'customLabel'> {
  filters?: QueryFilter[];
}

export const getFiltersBucketAgg = ({ getConfig }: FiltersBucketAggDependencies) =>
  new BucketAggType({
    name: BUCKET_TYPES.FILTERS,
    expressionName: aggFiltersFnName,
    title: filtersTitle,
    createFilter: createFilterFilters,
    customLabels: false,
    params: [
      {
        name: 'filters',
        default: () => [
          {
            input: { query: '', language: getConfig(UI_SETTINGS.SEARCH_QUERY_LANGUAGE) },
            label: '',
          },
        ],
        write(aggConfig, output) {
          const inFilters: FilterValue[] = aggConfig.params.filters;
          if (!size(inFilters)) return;

          const outFilters = transform(
            inFilters,
            function (filters: Record<string, any>, filter) {
              const input = cloneDeep(filter.input);

              if (!input) {
                console.log('malformed filter agg params, missing "input" query'); // eslint-disable-line no-console
                return;
              }

              const esQueryConfigs = getEsQueryConfig({ get: getConfig });
              const query = buildEsQuery(aggConfig.getIndexPattern(), [input], [], esQueryConfigs);

              if (!query) {
                console.log('malformed filter agg params, missing "query" on input'); // eslint-disable-line no-console
                return;
              }

              const matchAllLabel = filter.input.query === '' ? '*' : '';
              const label =
                filter.label ||
                matchAllLabel ||
                (typeof filter.input.query === 'string'
                  ? filter.input.query
                  : JSON.stringify(filter.input.query));
              filters[label] = query;
            },
            {}
          );

          if (!size(outFilters)) return;

          const params = output.params || (output.params = {});
          params.filters = outFilters;
        },
        toExpressionAst: (filters: AggParamsFilters['filters']) => filters?.map(queryFilterToAst),
      },
    ],
  });
