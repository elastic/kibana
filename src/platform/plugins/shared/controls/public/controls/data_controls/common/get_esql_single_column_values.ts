/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeRange } from '@kbn/es-query';
import { getESQLResults } from '@kbn/esql-utils';
import { dataService } from '../../../services/kibana_services';

export interface GetESQLSingleColumnValuesSuccess {
  values: string[];
  column: string;
}

export interface GetESQLSingleColumnValuesFailure {
  error: Error;
  columns?: string[];
}

type GetESQLSingleColumnValuesMultiColumnFailure = Required<GetESQLSingleColumnValuesFailure>;

export interface GetESQLSingleColumnValuesParams {
  query: string;
  timeRange?: TimeRange;
  abortSignal?: AbortSignal;
}
export const getESQLSingleColumnValues = async ({
  query,
  timeRange,
  abortSignal,
}: GetESQLSingleColumnValuesParams): Promise<
  GetESQLSingleColumnValuesSuccess | GetESQLSingleColumnValuesFailure
> => {
  try {
    const results = await getESQLResults({
      esqlQuery: query,
      search: dataService.search.search,
      signal: abortSignal,
      filter: undefined,
      dropNullColumns: true,
      timeRange,
    });
    const columns = results.response.columns.map((col) => col.name);

    if (columns.length === 1) {
      const values = results.response.values
        .map((value) => value[0])
        .filter(Boolean)
        .map((option) => String(option));
      return { values, column: columns[0] };
    }

    return { error: new Error('Query must return a single column'), columns };
  } catch (e) {
    return { error: e };
  }
};

getESQLSingleColumnValues.isSuccess = (
  result: unknown
): result is GetESQLSingleColumnValuesSuccess =>
  'values' in (result as GetESQLSingleColumnValuesSuccess);

getESQLSingleColumnValues.isMultiColumnError = (
  result: unknown
): result is GetESQLSingleColumnValuesMultiColumnFailure =>
  'columns' in (result as GetESQLSingleColumnValuesMultiColumnFailure);
