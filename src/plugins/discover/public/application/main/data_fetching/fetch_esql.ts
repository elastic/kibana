/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pluck } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { Query, AggregateQuery, Filter, TimeRange } from '@kbn/es-query';
import type { Adapters } from '@kbn/inspector-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { textBasedQueryStateToAstWithValidation } from '@kbn/data-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';
import { CoreStart } from '@kbn/core/public';
import type { RecordsFetchResponse } from '../../types';
import type { ProfilesManager } from '../../../context_awareness';

interface EsqlErrorResponse {
  error: {
    message: string;
  };
  type: 'error';
}

export async function fetchEsql({
  query,
  inputQuery,
  filters,
  inputTimeRange,
  dataView,
  abortSignal,
  inspectorAdapters,
  data,
  expressions,
  profilesManager,
  core,
}: {
  query: Query | AggregateQuery;
  inputQuery?: Query;
  filters?: Filter[];
  inputTimeRange?: TimeRange;
  dataView: DataView;
  abortSignal?: AbortSignal;
  inspectorAdapters: Adapters;
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
  profilesManager: ProfilesManager;
  core: CoreStart;
}): Promise<RecordsFetchResponse> {
  const timeRange = inputTimeRange ?? data.query.timefilter.timefilter.getTime();
  if (!('esql' in query)) {
    throw new Error('No ESQL query provided');
  }
  // do some dirty hacking here:
  const inputString = query.esql;

  // Regular expression to match all FROM_SOURCE calls with their parameters
  const regex = /FROM_SOURCE\(\s*\"(.+?)\"\s*,\s*\"(.+?)\"\s*\)/g;

  // Counter to track which replacement string to use
  let replacementIndex = 0;

  const runtimefields: Array<[string, string]> = [];

  // Replace all occurrences of FROM_SOURCE calls with different replacement strings
  const replacementQuery = inputString.replaceAll(regex, (match, params0, params1) => {
    // Get the appropriate replacement string based on the index
    const replacement = params0;

    // Increment the index for the next replacement
    replacementIndex++;
    runtimefields.push([params0, params1]);

    return replacement;
  });

  const newQuery = {
    esql: replacementQuery,
  };

  for (const [fieldName, fieldType] of runtimefields) {
    await core.http.post('/api/add_runtime_field', {
      body: JSON.stringify({
        fieldName,
        fieldType,
        indexPattern: dataView.name,
      }),
    });
  }

  return textBasedQueryStateToAstWithValidation({
    filters,
    query: newQuery,
    time: timeRange,
    dataView,
    inputQuery,
    titleForInspector: i18n.translate('discover.inspectorEsqlRequestTitle', {
      defaultMessage: 'Table',
    }),
    descriptionForInspector: i18n.translate('discover.inspectorEsqlRequestDescription', {
      defaultMessage: 'This request queries Elasticsearch to fetch results for the table.',
    }),
  })
    .then((ast) => {
      if (ast) {
        const contract = expressions.execute(ast, null, {
          inspectorAdapters,
        });
        abortSignal?.addEventListener('abort', contract.cancel);
        const execution = contract.getData();
        let finalData: DataTableRecord[] = [];
        let esqlQueryColumns: Datatable['columns'] | undefined;
        let error: string | undefined;
        let esqlHeaderWarning: string | undefined;
        execution.pipe(pluck('result')).subscribe((resp) => {
          const response = resp as Datatable | EsqlErrorResponse;
          if (response.type === 'error') {
            error = response.error.message;
          } else {
            const table = response as Datatable;
            const rows = table?.rows ?? [];
            esqlQueryColumns = table?.columns ?? undefined;
            esqlHeaderWarning = table.warning ?? undefined;
            finalData = rows.map((row, idx) => {
              const record: DataTableRecord = {
                id: String(idx),
                raw: row,
                flattened: row,
              };

              return profilesManager.resolveDocumentProfile({ record });
            });
          }
        });
        return lastValueFrom(execution).then(async () => {
          if (error) {
            throw new Error(error);
          } else {
            for (const [fieldName] of runtimefields) {
              await core.http.post('/api/remove_runtime_field', {
                body: JSON.stringify({
                  fieldName,
                  indexPattern: dataView.name,
                }),
              });
            }
            return {
              records: finalData || [],
              esqlQueryColumns,
              esqlHeaderWarning,
            };
          }
        });
      }
      return {
        records: [],
        esqlQueryColumns: [],
        esqlHeaderWarning: undefined,
      };
    })
    .catch((err) => {
      throw new Error(err.message);
    });
}
