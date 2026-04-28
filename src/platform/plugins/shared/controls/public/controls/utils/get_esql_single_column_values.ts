/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ISearchGeneric } from '@kbn/search-types';
import type { TimeRange } from '@kbn/es-query';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';

import type {
  GetESQLSingleColumnValuesFailure,
  GetESQLSingleColumnValuesSuccess,
} from '../../../common/options_list/get_esql_single_column_values';
import { getESQLSingleColumnValues as getESQLSingleColumnValuesCommon } from '../../../common/options_list/get_esql_single_column_values';

import { coreServices } from '../../services/kibana_services';

export type {
  GetESQLSingleColumnValuesFailure,
  GetESQLSingleColumnValuesSuccess,
  GetESQLSingleColumnValuesSuccessNumber,
  GetESQLSingleColumnValuesSuccessNoResults,
  GetESQLSingleColumnValuesSuccessString,
} from '../../../common/options_list/get_esql_single_column_values';

interface GetESQLSingleColumnValuesParams {
  query: string;
  search: ISearchGeneric;
  signal?: AbortSignal;
  timeRange?: TimeRange;
  filter?: unknown;
  esqlVariables: ESQLControlVariable[];
}

export const getESQLSingleColumnValues = Object.assign(
  async ({
    query,
    search,
    signal,
    timeRange,
    filter,
    esqlVariables,
  }: GetESQLSingleColumnValuesParams): Promise<
    GetESQLSingleColumnValuesSuccess | GetESQLSingleColumnValuesFailure
  > => {
    const timezone = coreServices.uiSettings?.get<'Browser' | string>(UI_SETTINGS.DATEFORMAT_TZ);
    return getESQLSingleColumnValuesCommon({
      query,
      search,
      signal,
      timeRange,
      filter,
      esqlVariables,
      timezone,
    });
  },
  {
    isSuccess: getESQLSingleColumnValuesCommon.isSuccess,
    isNumericResult: getESQLSingleColumnValuesCommon.isNumericResult,
    isMultiColumnError: getESQLSingleColumnValuesCommon.isMultiColumnError,
    hasNoResults: getESQLSingleColumnValuesCommon.hasNoResults,
  }
);
