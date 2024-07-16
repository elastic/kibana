/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import { getESQLWithSafeLimit, getESQLResults } from '@kbn/esql-utils';
import type { FieldStatsResponse } from '../../types';
import {
  buildSearchFilter,
  SearchHandlerTextBased,
  fetchAndCalculateFieldStats,
} from './field_stats_utils_text_based';
import { ESQL_SAFE_LIMIT } from '../../constants';

interface FetchFieldStatsParamsTextBased {
  services: {
    data: DataPublicPluginStart;
  };
  dataView: DataView;
  field: DataViewField;
  fromDate: string;
  toDate: string;
  baseQuery: AggregateQuery;
  abortController?: AbortController;
}

export type LoadFieldStatsTextBasedHandler = (
  params: FetchFieldStatsParamsTextBased
) => Promise<FieldStatsResponse<string | boolean>>;

/**
 * Loads and aggregates stats data for an ES|QL query field
 * @param services
 * @param dataView
 * @param field
 * @param fromDate
 * @param toDate
 * @param baseQuery
 * @param abortController
 */
export const loadFieldStatsTextBased: LoadFieldStatsTextBasedHandler = async ({
  services,
  dataView,
  field,
  fromDate,
  toDate,
  baseQuery,
  abortController,
}) => {
  const { data } = services;

  try {
    if (!dataView?.id || !field?.type) {
      return {};
    }

    const searchHandler: SearchHandlerTextBased = async ({ query }) => {
      const filter = buildSearchFilter({ timeFieldName: dataView.timeFieldName, fromDate, toDate });
      const result = await getESQLResults({
        esqlQuery: query,
        filter,
        search: data.search.search,
        signal: abortController?.signal,
        timeRange: { from: fromDate, to: toDate },
      });
      return result.response;
    };

    if (!('esql' in baseQuery)) {
      throw new Error('query must be of type AggregateQuery');
    }

    return await fetchAndCalculateFieldStats({
      searchHandler,
      field,
      esqlBaseQuery: getESQLWithSafeLimit(baseQuery.esql, ESQL_SAFE_LIMIT),
    });
  } catch (error) {
    // console.error(error);
    throw new Error('Could not provide field stats', { cause: error });
  }
};
