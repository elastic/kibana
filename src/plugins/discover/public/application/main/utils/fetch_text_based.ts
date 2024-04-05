/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { pluck } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { Query, AggregateQuery, Filter } from '@kbn/es-query';
import type { Adapters } from '@kbn/inspector-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { textBasedQueryStateToAstWithValidation } from '@kbn/data-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { RecordsFetchResponse } from '../../types';

interface TextBasedErrorResponse {
  error: {
    message: string;
  };
  type: 'error';
}

export function fetchTextBased(
  query: Query | AggregateQuery,
  dataView: DataView,
  data: DataPublicPluginStart,
  expressions: ExpressionsStart,
  inspectorAdapters: Adapters,
  abortSignal?: AbortSignal,
  filters?: Filter[],
  inputQuery?: Query
): Promise<RecordsFetchResponse> {
  const timeRange = data.query.timefilter.timefilter.getTime();
  return textBasedQueryStateToAstWithValidation({
    filters,
    query,
    time: timeRange,
    dataView,
    inputQuery,
  })
    .then((ast) => {
      if (ast) {
        const contract = expressions.execute(ast, null, {
          inspectorAdapters,
          inspectorTitle: i18n.translate('discover.inspectorTextBasedRequestDataTitle', {
            defaultMessage: 'Results',
          }),
          inspectorDescription: i18n.translate(
            'discover.inspectorTextBasedRequestDescriptionDocument',
            {
              defaultMessage: 'This request queries Elasticsearch using ES|QL to fetch results.',
            }
          ),
        });
        abortSignal?.addEventListener('abort', contract.cancel);
        const execution = contract.getData();
        let finalData: DataTableRecord[] = [];
        let textBasedQueryColumns: Datatable['columns'] | undefined;
        let error: string | undefined;
        let textBasedHeaderWarning: string | undefined;
        execution.pipe(pluck('result')).subscribe((resp) => {
          const response = resp as Datatable | TextBasedErrorResponse;
          if (response.type === 'error') {
            error = response.error.message;
          } else {
            const table = response as Datatable;
            const rows = table?.rows ?? [];
            textBasedQueryColumns = table?.columns ?? undefined;
            textBasedHeaderWarning = table.warning ?? undefined;
            finalData = rows.map((row: Record<string, string>, idx: number) => {
              return {
                id: String(idx),
                raw: row,
                flattened: row,
              } as unknown as DataTableRecord;
            });
          }
        });
        return lastValueFrom(execution).then(() => {
          if (error) {
            throw new Error(error);
          } else {
            return {
              records: finalData || [],
              textBasedQueryColumns,
              textBasedHeaderWarning,
            };
          }
        });
      }
      return {
        records: [] as DataTableRecord[],
        textBasedQueryColumns: [],
        textBasedHeaderWarning: undefined,
      };
    })
    .catch((err) => {
      throw new Error(err.message);
    });
}
