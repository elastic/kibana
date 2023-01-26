/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { lastValueFrom } from 'rxjs';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldStatsResponse } from '../../../common/types';
import {
  fetchAndCalculateFieldStats,
  SearchHandler,
  buildSearchParams,
} from '../../../common/utils/field_stats_utils';

interface FetchFieldStatsParams {
  services: {
    data: DataPublicPluginStart;
  };
  dataView: DataView;
  field: DataViewField;
  fromDate: string;
  toDate: string;
  dslQuery: object;
  size?: number;
  abortController?: AbortController;
}

export type LoadFieldStatsHandler = (
  params: FetchFieldStatsParams
) => Promise<FieldStatsResponse<string | number>>;

/**
 * Loads and aggregates stats data for a data view field
 * @param services
 * @param dataView
 * @param field
 * @param fromDate
 * @param toDate
 * @param dslQuery
 * @param size
 * @param abortController
 */
export const loadFieldStats: LoadFieldStatsHandler = async ({
  services,
  dataView,
  field,
  fromDate,
  toDate,
  dslQuery,
  size,
  abortController,
}) => {
  const { data } = services;

  try {
    if (!dataView?.id || !field?.type) {
      return {};
    }

    const searchHandler: SearchHandler = async (body) => {
      const result = await lastValueFrom(
        data.search.search(
          {
            params: buildSearchParams({
              dataViewPattern: dataView.title,
              timeFieldName: dataView.timeFieldName,
              fromDate,
              toDate,
              dslQuery,
              runtimeMappings: dataView.getRuntimeMappings(),
              ...body,
            }),
          },
          {
            abortSignal: abortController?.signal,
          }
        )
      );
      return result.rawResponse;
    };

    return await fetchAndCalculateFieldStats({
      searchHandler,
      dataView,
      field,
      fromDate,
      toDate,
      size,
    });
  } catch (error) {
    // console.error(error);
    throw new Error('Could not provide field stats', { cause: error });
  }
};
