/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { pluck } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs';
import { Query, AggregateQuery, Filter } from '@kbn/es-query';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import { textBasedQueryStateToAstWithValidation } from '@kbn/data-plugin/common';
import { DataTableRecord } from '../../../types';

interface SQLErrorResponse {
  error: {
    message: string;
  };
  type: 'error';
}

export function fetchSql(
  query: Query | AggregateQuery,
  dataViewsService: DataViewsContract,
  data: DataPublicPluginStart,
  expressions: ExpressionsStart,
  filters?: Filter[],
  inputQuery?: Query
) {
  const timeRange = data.query.timefilter.timefilter.getTime();
  return textBasedQueryStateToAstWithValidation({
    filters,
    query,
    time: timeRange,
    dataViewsService,
    inputQuery,
  })
    .then((ast) => {
      if (ast) {
        const execution = expressions.run(ast, null);
        let finalData: DataTableRecord[] = [];
        let error: string | undefined;
        execution.pipe(pluck('result')).subscribe((resp) => {
          const response = resp as Datatable | SQLErrorResponse;
          if (response.type === 'error') {
            error = response.error.message;
          } else {
            const table = response as Datatable;
            const rows = table?.rows ?? [];
            finalData = rows.map(
              (row: Record<string, string>, idx: number) =>
                ({
                  id: String(idx),
                  raw: row,
                  flattened: row,
                } as unknown as DataTableRecord)
            );
          }
        });
        return lastValueFrom(execution).then(() => {
          if (error) {
            throw new Error(error);
          } else {
            return finalData || [];
          }
        });
      }
      return [];
    })
    .catch((err) => {
      throw new Error(err.message);
    });
}
