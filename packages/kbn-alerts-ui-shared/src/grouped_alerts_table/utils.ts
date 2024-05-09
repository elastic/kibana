/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Filter, EsQueryConfig, Query, DataViewBase } from '@kbn/es-query';
import { FilterStateStore, buildEsQuery } from '@kbn/es-query';
import { isEmpty } from 'lodash/fp';

export type PrimitiveOrArrayOfPrimitives =
  | string
  | number
  | boolean
  | Array<string | number | boolean>;

export interface CombineQueries {
  config: EsQueryConfig;
  dataProviders: DataProvider[];
  indexPattern: DataViewBase;
  browserFields: BrowserFields;
  filters: Filter[];
  kqlQuery: Query;
  kqlMode: string;
}

export const buildTimeRangeFilter = (from: string, to: string): Filter =>
  ({
    range: {
      '@timestamp': {
        gte: from,
        lt: to,
        format: 'strict_date_optional_time',
      },
    },
    meta: {
      type: 'range',
      disabled: false,
      negate: false,
      alias: null,
      key: '@timestamp',
      params: {
        gte: from,
        lt: to,
        format: 'strict_date_optional_time',
      },
    },
    $state: {
      store: FilterStateStore.APP_STATE,
    },
  } as Filter);

export const isDataProviderEmpty = (dataProviders: DataProvider[]) => {
  return isEmpty(dataProviders) || isEmpty(dataProviders.filter((d) => d.enabled === true));
};

export const convertToBuildEsQuery = ({
  config,
  indexPattern,
  queries,
  filters,
}: {
  config: EsQueryConfig;
  indexPattern: DataViewBase | undefined;
  queries: Query[];
  filters: Filter[];
}): [string, undefined] | [undefined, Error] => {
  try {
    return [
      JSON.stringify(
        buildEsQuery(
          indexPattern,
          queries,
          filters.filter((f) => f.meta.disabled === false),
          {
            nestedIgnoreUnmapped: true, // by default, prevent shard failures when unmapped `nested` fields are queried: https://github.com/elastic/kibana/issues/130340
            ...config,
            dateFormatTZ: undefined,
          }
        )
      ),
      undefined,
    ];
  } catch (error) {
    return [undefined, error];
  }
};

export const combineQueries = ({
  config,
  dataProviders = [],
  indexPattern,
  browserFields,
  filters = [],
  kqlQuery,
  kqlMode,
}: CombineQueries): { filterQuery: string | undefined; kqlError: Error | undefined } | null => {
  const kuery: Query = { query: '', language: kqlQuery.language };
  if (isDataProviderEmpty(dataProviders) && isEmpty(kqlQuery.query) && isEmpty(filters)) {
    return null;
  } else if (isDataProviderEmpty(dataProviders) && isEmpty(kqlQuery.query) && !isEmpty(filters)) {
    const [filterQuery, kqlError] = convertToBuildEsQuery({
      config,
      queries: [kuery],
      indexPattern,
      filters,
    });

    return {
      filterQuery,
      kqlError,
    };
  }

  const operatorKqlQuery = kqlMode === 'filter' ? 'and' : 'or';

  const postpend = (q: string) => `${!isEmpty(q) ? `(${q})` : ''}`;

  const globalQuery = buildGlobalQuery(dataProviders, browserFields); // based on Data Providers

  const querySuffix = postpend(kqlQuery.query as string); // based on Unified Search bar

  const queryPrefix = globalQuery ? `(${globalQuery})` : '';

  const queryOperator = queryPrefix && querySuffix ? operatorKqlQuery : '';

  kuery.query = `(${queryPrefix} ${queryOperator} ${querySuffix})`;

  const [filterQuery, kqlError] = convertToBuildEsQuery({
    config,
    queries: [kuery],
    indexPattern,
    filters,
  });

  return {
    filterQuery,
    kqlError,
  };
};
