/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataPublicPluginStart, IKibanaSearchRequest } from '@kbn/data-plugin/public';
import { DataTableRecord } from '../../../types';

export interface EssqlSearchStrategyRequest extends IKibanaSearchRequest {
  count?: number;
  query: string;
  params?: Array<string | number | boolean>;
  timezone?: string;
  filter: unknown[];
}

export interface EssqlSearchStrategyResponse {
  columns: Array<{
    id: string;
    name: string;
    meta: {
      type: string;
    };
  }>;
  rows: Array<Record<string, string>>;
  rawResponse: Array<Record<string, unknown>>;
}

export function fetchSql(query: string, data: DataPublicPluginStart) {
  return data.search
    .search<EssqlSearchStrategyRequest, EssqlSearchStrategyResponse>(
      { query, filter: [] },
      {
        strategy: 'essql',
      }
    )
    .toPromise()
    .then((resp) => {
      const rows = resp?.rows ?? [];
      return rows.map(
        (row: Record<string, string>, idx: number) =>
          ({
            id: String(idx),
            raw: row,
            flattened: row,
          } as unknown as DataTableRecord)
      );
    })
    .catch((e) => {
      let message = `Unexpected error from Elasticsearch: ${e.message}`;
      if (e.err) {
        const { type, reason } = e.err.attributes;
        if (type === 'parsing_exception') {
          message = `Couldn't parse Elasticsearch SQL query. You may need to add double quotes to names containing special characters. Check your query and try again. Error: ${reason}`;
        } else {
          message = `Unexpected error from Elasticsearch: ${type} - ${reason}`;
        }
      }
      throw new Error(message);
    });
}
