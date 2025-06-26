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
import { getESQLResults } from './run_query';

export interface ESQLQueryToOptionsSuccess {
  options: string[];
}

export interface ESQLQueryToOptionsFailure {
  columns: string[];
  errors: Error[];
}

interface ESQLQueryToOptionsParams {
  query: string;
  search: ISearchGeneric;
  timeRange?: TimeRange;
}
export const esqlQueryToOptions = async ({
  query,
  search,
  timeRange,
}: ESQLQueryToOptionsParams): Promise<ESQLQueryToOptionsSuccess | ESQLQueryToOptionsFailure> => {
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
      const options = results.response.values
        .map((value) => value[0])
        .filter(Boolean)
        .map((option) => String(option));
      return { options };
    }

    return { columns, errors: [] };
  } catch (e) {
    return { columns: [], errors: [e] };
  }
};

esqlQueryToOptions.isSuccess = (result: unknown): result is ESQLQueryToOptionsSuccess =>
  'options' in (result as ESQLQueryToOptionsSuccess);
