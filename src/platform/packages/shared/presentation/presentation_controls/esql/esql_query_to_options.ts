/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getESQLResults } from '@kbn/esql-utils';
import { ISearchGeneric } from '@kbn/search-types';

export interface ESQLControlOptionsResult {
  options: string[];
  columns: string[];
  errors: Error[];
}

export const esqlQueryToOptions = async (
  query: string,
  search: ISearchGeneric
): Promise<ESQLControlOptionsResult> => {
  try {
    const results = await getESQLResults({
      esqlQuery: query,
      search,
      signal: undefined,
      filter: undefined,
      dropNullColumns: true,
    });
    const columns = results.response.columns.map((col) => col.name);

    if (columns.length === 1) {
      const options = results.response.values
        .map((value) => value[0])
        .filter(Boolean)
        .map((option) => String(option));
      return { options, columns, errors: [] };
    }

    return { options: [], columns, errors: [] };
  } catch (e) {
    return { options: [], columns: [], errors: [e] };
  }
};
