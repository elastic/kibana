/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useAbortableAsync } from '@kbn/react-hooks';
import { getESQLQueryColumnsRaw } from '@kbn/esql-utils';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getUnifiedDocViewerServices } from '../../../../../plugin';

export interface UseQueryableEsqlColumnsResult {
  /**
   * Names of the columns that can be referenced in an ES|QL query against the
   * index pattern. `undefined` while resolution is in progress or after it
   * failed.
   */
  queryableColumns?: Set<string>;
  loading: boolean;
}

async function fetchQueryableColumns(
  indexPattern: string,
  search: DataPublicPluginStart['search']['search'],
  signal: AbortSignal
): Promise<Set<string>> {
  const columns = await getESQLQueryColumnsRaw({
    esqlQuery: `FROM ${indexPattern}`,
    search,
    signal,
  });

  return new Set(
    columns.filter((column) => column.type !== 'unsupported').map((column) => column.name)
  );
}

/**
 * Resolves the set of columns that can be referenced in an ES|QL query against
 * `indexPattern`. Referencing a column that is unmapped or inconsistently
 * mapped across the pattern's indices fails the whole query with
 * a verification_exception. The columns are resolved through ES|QL itself
 * (`FROM <pattern> | LIMIT 0`) rather than field caps, because field caps does
 * not surface all mapping conflicts that ES|QL rejects (a field mapped as
 * `object` in one index and `text` in another is reported by field caps as a
 * plain text field, but is an unsupported column in ES|QL).
 */
export function useQueryableEsqlColumns(indexPattern?: string): UseQueryableEsqlColumnsResult {
  const {
    data: { search },
  } = getUnifiedDocViewerServices();

  const {
    value,
    error,
    loading: isFetchInFlight,
  } = useAbortableAsync(
    ({ signal }) =>
      indexPattern ? fetchQueryableColumns(indexPattern, search.search, signal) : undefined,
    [search, indexPattern]
  );

  // `isFetchInFlight` only turns on once the fetch effect has run; also treat
  // the window before the first resolution as loading so consumers don't build
  // queries from an unresolved column set.
  const awaitingFirstResolution = Boolean(indexPattern) && !value && !error;

  return {
    queryableColumns: value,
    loading: isFetchInFlight || awaitingFirstResolution,
  };
}
