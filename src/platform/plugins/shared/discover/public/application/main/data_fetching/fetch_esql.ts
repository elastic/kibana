/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  type Query,
  type AggregateQuery,
  type Filter,
  type TimeRange,
  type ProjectRouting,
  isOfAggregateQueryType,
} from '@kbn/es-query';
import { RequestAdapter, type Adapters } from '@kbn/inspector-plugin/common';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import { getDocId, type DataTableRecord } from '@kbn/discover-utils';
import type { EsqlSource } from '@kbn/data-source';
import type { SearchResponseWarning } from '@kbn/search-response-warnings';
import moment from 'moment';
import type { ESQLColumnsWithHighlights } from '@kbn/esql-utils';
import { getColumnsWithHighlights } from '@kbn/esql-utils';
import type { RecordsFetchResponse } from '../../types';
import type { ScopedProfilesManager } from '../../../context_awareness';

export interface FetchEsqlParams {
  query: Query | AggregateQuery;
  inputQuery?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
  /** Time field comes from this source. Table columns, including `isNull`, are written onto it. */
  esqlSource?: EsqlSource;
  abortSignal?: AbortSignal;
  inspectorAdapters: Adapters;
  data: DataPublicPluginStart;
  scopedProfilesManager: ScopedProfilesManager;
  esqlVariables?: ESQLControlVariable[];
  searchSessionId?: string;
  projectRouting?: ProjectRouting;
  esqlApproximation: boolean;
  inspectorConfig?: {
    title: string;
    description: string;
  };
}

export async function fetchEsql({
  query,
  inputQuery,
  filters,
  timeRange,
  esqlSource,
  abortSignal,
  inspectorAdapters,
  data,
  scopedProfilesManager,
  esqlVariables,
  searchSessionId,
  projectRouting,
  esqlApproximation,
  inspectorConfig,
}: FetchEsqlParams): Promise<RecordsFetchResponse> {
  if (!isOfAggregateQueryType(query)) {
    return {
      records: [],
      dataSource: esqlSource,
      interceptedWarnings: [],
      esqlHeaderWarning: undefined,
      approximationApplied: undefined,
    };
  }

  try {
    const { datatable } = await data.search.esql(
      {
        query: query.esql,
        locale: i18n.getLocale(),
        kibanaQueryContext: {
          timeRange: timeRange ?? data.query.timefilter.timefilter.getAbsoluteTime(),
          timeField: esqlSource?.timeFieldName,
          kibanaFilters: filters,
          kqlQuery: inputQuery,
          esqlVariables,
        },
        approximation: esqlApproximation,
        projectRouting,
        dropNullColumns: true,
        includeExecutionMetadata: true,
        columnMetadata: true,
      },
      {
        abortSignal,
        sessionId: searchSessionId,
        includeDataTable: true,
        inspector: {
          adapter: inspectorAdapters.requests ?? new RequestAdapter(),
          title:
            inspectorConfig?.title ??
            i18n.translate('discover.inspectorEsqlRequestTitle', {
              defaultMessage: 'Table',
            }),
          description:
            inspectorConfig?.description ??
            i18n.translate('discover.inspectorEsqlRequestDescription', {
              defaultMessage: 'This request queries Elasticsearch to fetch results for the table.',
            }),
        },
      }
    );

    const finalColumns = datatable?.columns ?? [];
    const rows = datatable?.rows ?? [];
    const responseTime = moment().format('YYYY-MM-DD_HH_mm_ss');
    let inlineHighlights: ESQLColumnsWithHighlights | undefined;
    try {
      inlineHighlights = getColumnsWithHighlights(
        query.esql,
        finalColumns.map(({ name }) => name)
      );
    } catch (_e) {
      inlineHighlights = undefined;
    }
    const hasInlineHighlights = Object.keys(inlineHighlights ?? {}).length > 0;
    const records = rows.map((row, idx) => {
      const raw = hasInlineHighlights ? { ...row, inline_highlights: inlineHighlights } : row;
      const record: DataTableRecord = {
        id: row._index && row._id ? getDocId(row) : `${idx + 1}@${responseTime}`,
        raw,
        flattened: row,
      };

      return scopedProfilesManager.resolveDocumentProfile({ record });
    });

    const adapter = inspectorAdapters.requests;
    const interceptedWarnings: SearchResponseWarning[] = [];
    if (adapter) {
      data.search.showWarnings(adapter, (warning) => {
        interceptedWarnings.push(warning);
        return true; // suppress the default behaviour
      });
    }
    return {
      records,
      dataSource: esqlSourceWithColumns(esqlSource, finalColumns),
      interceptedWarnings,
      esqlHeaderWarning: datatable?.warning ?? undefined,
      approximationApplied: datatable?.meta?.approximationApplied,
    };
  } catch (err) {
    throw new Error(err.message);
  }
}

/** Copies table nullability onto the LIMIT 0 source. An empty table keeps the original source. */
function esqlSourceWithColumns(
  esqlSource: EsqlSource | undefined,
  columns: DatatableColumn[]
): EsqlSource | undefined {
  if (!esqlSource || columns.length === 0) {
    return esqlSource;
  }
  return esqlSource.withColumns(columns);
}
