/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esFieldTypeToKibanaFieldType, KBN_FIELD_TYPES } from '@kbn/field-types';
import type { TimeRange } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import {
  getIndexPatternFromESQLQuery,
  fixESQLQueryWithVariables,
  mapVariableToColumn,
  isComputedColumn,
  getQuerySummary,
  buildRenameSourceFieldMap,
} from '@kbn/esql-utils';
import { zipObject } from 'lodash';
import DateMath from '@kbn/datemath';
import { ESQL_TABLE_TYPE } from '../strategies/esql_search/types';

export interface EsqlDatatableContext {
  /** Original ES|QL query string (before variable substitution) */
  query: string;
  timeRange?: TimeRange;
  esqlVariables?: ESQLControlVariable[];
  warning?: string;
}

/** Maps a raw ES|QL response to an expressions Datatable. */
export const mapEsqlResponseToDatatable = (
  body: ESQLSearchResponse,
  { query, timeRange, esqlVariables = [], warning }: EsqlDatatableContext
): Datatable => {
  // all_columns in the response means that there is a separation between
  // columns with data and empty columns — columns only contains columns with data
  const hasEmptyColumns = body.all_columns && body.all_columns?.length > body.columns.length;
  const lookup = new Set(hasEmptyColumns ? body.columns?.map(({ name }) => name) || [] : []);
  const indexPattern = getIndexPatternFromESQLQuery(query);
  const approximationApplied = body.approximation_applied;

  const appliedTimeRange = timeRange
    ? {
        from: DateMath.parse(timeRange.from)?.toISOString(),
        to: DateMath.parse(timeRange.to, { roundUp: true })?.toISOString(),
      }
    : undefined;

  // Normalize body.values: if all arrays are empty, treat as empty result
  const normalizedValues = body.values.every((row) => Array.isArray(row) && row.length === 0)
    ? []
    : body.values;

  const querySummary = getQuerySummary(query);
  const renameSourceFieldMap: Map<string, string> | null = querySummary.renamedColumnsPairs?.size
    ? buildRenameSourceFieldMap(query)
    : null;

  const allColumns =
    (body.all_columns ?? body.columns)?.map(({ name, type, original_types, _meta }) => {
      const originalTypes = original_types ?? [];
      const hasConflict = type === 'unsupported' && originalTypes.length > 1;
      const kibanaFieldType = hasConflict
        ? KBN_FIELD_TYPES.CONFLICT
        : esFieldTypeToKibanaFieldType(type);

      const isSourceFieldFilterable =
        !querySummary.newColumns.has(name) || (renameSourceFieldMap?.has(name) ?? false);
      const sourceField = renameSourceFieldMap?.get(name) ?? name;

      return {
        id: name,
        name,
        meta: {
          type: kibanaFieldType,
          esType: type,
          sourceParams:
            type === 'date'
              ? { appliedTimeRange, params: {}, indexPattern, sourceField, isSourceFieldFilterable }
              : { indexPattern, sourceField, isSourceFieldFilterable },
          params: { id: kibanaFieldType },
          ...(_meta !== undefined && { esMeta: _meta }),
        },
        isNull: hasEmptyColumns ? !lookup.has(name) : false,
        isComputedColumn: isComputedColumn(name, querySummary),
      };
    }) ?? [];

  const fixedQuery = fixESQLQueryWithVariables(query, esqlVariables);
  const updatedWithVariablesColumns = mapVariableToColumn(
    fixedQuery,
    esqlVariables,
    allColumns as DatatableColumn[]
  );

  // Sort so null columns are last, to correctly align with values array
  if (hasEmptyColumns) {
    updatedWithVariablesColumns.sort((a, b) => Number(a.isNull) - Number(b.isNull));
  }

  const columnNames = updatedWithVariablesColumns.map(({ name }) => name);
  const rows = normalizedValues.map((row) => zipObject(columnNames, row));

  return {
    type: 'datatable',
    meta: {
      type: ESQL_TABLE_TYPE,
      query,
      statistics: { totalCount: normalizedValues.length },
      ...(approximationApplied !== undefined && { approximationApplied }),
    },
    columns: updatedWithVariablesColumns,
    rows,
    warning,
  } as Datatable;
};

/** Extracts a structured `{ type, reason }` from an Elasticsearch error attributes object. */
export const extractEsqlErrorInfo = (attributes: unknown): { type?: string; reason?: string } => {
  if (!attributes || typeof attributes !== 'object') return {};
  const attrs = attributes as Record<string, unknown>;
  if ('type' in attrs && 'reason' in attrs) {
    return { type: attrs.type as string, reason: attrs.reason as string };
  }
  if ('error' in attrs) {
    return extractEsqlErrorInfo(attrs.error);
  }
  return {};
};

/** Re-formats an Elasticsearch ES|QL error into a user-friendly message and re-throws it. */
export const formatAndRethrowEsqlError = (error: unknown): never => {
  const err = error as Record<string, unknown> & { message: string };
  if (!err.attributes) {
    err.message = `Unexpected error from Elasticsearch: ${err.message}`;
  } else {
    const { type, reason } = extractEsqlErrorInfo(err.attributes);
    if (type === 'parsing_exception') {
      err.message = `Couldn't parse Elasticsearch ES|QL query. Check your query and try again. Error: ${reason}`;
    } else {
      err.message = `Unexpected error from Elasticsearch: ${type} - ${reason}`;
    }
  }
  throw err;
};
