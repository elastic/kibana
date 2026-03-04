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
import type { Query, AggregateQuery, Filter, TimeRange, ProjectRouting } from '@kbn/es-query';
import type { Adapters } from '@kbn/inspector-plugin/common';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { textBasedQueryStateToAstWithValidation } from '@kbn/data-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import type { RecordsFetchResponse } from '../../types';
import type { ScopedProfilesManager } from '../../../context_awareness';

interface EsqlErrorResponse {
  error: {
    message: string;
  };
  type: 'error';
}

export interface FetchEsqlParams {
  query: Query | AggregateQuery;
  inputQuery?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
  dataView: DataView;
  abortSignal?: AbortSignal;
  inspectorAdapters: Adapters;
  data: DataPublicPluginStart;
  expressions: ExpressionsStart;
  scopedProfilesManager: ScopedProfilesManager;
  esqlVariables?: ESQLControlVariable[];
  searchSessionId?: string;
  projectRouting?: ProjectRouting;
  inspectorConfig?: {
    title: string;
    description: string;
  };
}

const MAX_MULTIPLIED_ROWS = 1_000_000;

function getMultiplierFromESQLQuery(esql: string): number {
  if (!esql) return 1;
  const match = esql.match(/(?:\/\/|\/\*)\s*(\d+)\s*x\b/i);
  if (!match) return 1;
  const value = parseInt(match[1], 10);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return value;
}

export function fetchEsql({
  query,
  inputQuery,
  filters,
  timeRange,
  dataView,
  abortSignal,
  inspectorAdapters,
  data,
  expressions,
  scopedProfilesManager,
  esqlVariables,
  searchSessionId,
  projectRouting,
  inspectorConfig,
}: FetchEsqlParams): Promise<RecordsFetchResponse> {
  const props = getTextBasedQueryStateToAstProps({
    query,
    inputQuery,
    filters,
    timeRange,
    dataView,
    data,
    inspectorConfig,
  });
  return textBasedQueryStateToAstWithValidation(props)
    .then((ast) => {
      if (ast) {
        const contract = expressions.execute(ast, null, {
          inspectorAdapters,
          searchContext: {
            timeRange,
            esqlVariables,
            projectRouting,
          },
          searchSessionId,
        });
        abortSignal?.addEventListener('abort', (e) => {
          contract.cancel((e.target as AbortSignal)?.reason);
        });
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

            const esqlString = 'esql' in query ? query.esql : '';
            const multiplier = getMultiplierFromESQLQuery(esqlString);
            const effectiveMultiplier =
              multiplier > 1
                ? Math.min(multiplier, Math.ceil(MAX_MULTIPLIED_ROWS / Math.max(rows.length, 1)))
                : 1;
            const expandedRows =
              effectiveMultiplier > 1
                ? Array.from({ length: effectiveMultiplier }, () =>
                    rows.map((row) => structuredClone(row))
                  ).flat()
                : rows;

            if (effectiveMultiplier > 1) {
              expandedRows.forEach((row, idx) => {
                row['@nr'] = idx + 1;
              });
              if (esqlQueryColumns && !esqlQueryColumns.some((c) => c.id === '@nr')) {
                esqlQueryColumns = [{ id: '@nr', name: '@nr', meta: { type: 'number' } }, ...esqlQueryColumns];
              }
            }

            finalData = expandedRows.map((row, idx) => {
              const record: DataTableRecord = {
                id: String(idx),
                raw: row,
                flattened: row,
              };

              return scopedProfilesManager.resolveDocumentProfile({ record });
            });
          }
        });
        return lastValueFrom(execution).then(() => {
          if (error) {
            throw new Error(error);
          } else {
            const adapter = inspectorAdapters.requests;
            const interceptedWarnings: SearchResponseWarning[] = [];
            if (adapter) {
              data.search.showWarnings(adapter, (warning) => {
                interceptedWarnings.push(warning);
                return true; // suppress the default behaviour
              });
            }
            return {
              records: finalData || [],
              interceptedWarnings,
              esqlQueryColumns,
              esqlHeaderWarning,
            };
          }
        });
      }
      return {
        records: [],
        interceptedWarnings: [],
        esqlQueryColumns: [],
        esqlHeaderWarning: undefined,
      };
    })
    .catch((err) => {
      throw new Error(err.message);
    });
}
export function getTextBasedQueryStateToAstProps({
  query,
  inputQuery,
  filters,
  timeRange,
  dataView,
  data,
  inspectorConfig,
}: {
  query: Query | AggregateQuery;
  inputQuery?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
  dataView: DataView;
  data: DataPublicPluginStart;
  inspectorConfig?: {
    title: string;
    description: string;
  };
}) {
  return {
    filters,
    query,
    time: timeRange ?? data.query.timefilter.timefilter.getAbsoluteTime(),
    timeFieldName: dataView.timeFieldName,
    inputQuery,
    titleForInspector:
      inspectorConfig?.title ??
      i18n.translate('discover.inspectorEsqlRequestTitle', {
        defaultMessage: 'Table',
      }),
    descriptionForInspector:
      inspectorConfig?.description ??
      i18n.translate('discover.inspectorEsqlRequestDescription', {
        defaultMessage: 'This request queries Elasticsearch to fetch results for the table.',
      }),
  };
}
