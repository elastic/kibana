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
import { getESQLResults } from '@kbn/esql-utils';

export interface GetESQLSingleColumnValuesSuccess {
  values: string[];
}

export interface GetESQLSingleColumnValuesFailure {
  errors: Error[];
}

interface GetESQLSingleColumnValuesParams {
  query: string;
  search: ISearchGeneric;
  timeRange?: TimeRange;
}
export const getESQLSingleColumnValues = async ({
  query,
  search,
  timeRange,
}: GetESQLSingleColumnValuesParams): Promise<
  GetESQLSingleColumnValuesSuccess | GetESQLSingleColumnValuesFailure
> => {
  try {
    const results = await getESQLResults({
      esqlQuery: query,
      search,
      signal: undefined,
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
      return { values };
    }

    return { errors: [new Error('Query must return a single column')] };
  } catch (e) {
    return { errors: [e] };
  }
};

getESQLSingleColumnValues.isSuccess = (
  result: unknown
): result is GetESQLSingleColumnValuesSuccess =>
  'values' in (result as GetESQLSingleColumnValuesSuccess);
