/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { getESQLQueryColumnsRaw } from '@kbn/esql-utils';
import { getUnifiedDocViewerServices } from '../../../../plugin';

export interface UseQueryableFieldsParams {
  indexPattern?: string;
  fields: string[];
}

export interface UseQueryableFieldsResult {
  /**
   * Fields that can be referenced as ES|QL columns in a query against the
   * index pattern, or `undefined` while resolution is in progress.
   */
  queryableFields?: Set<string>;
  loading: boolean;
}

/**
 * Resolves which of the given fields can be referenced as ES|QL columns in a
 * query against the given index pattern. Referencing a column that is unmapped
 * or inconsistently mapped across the pattern's indices fails the whole ES|QL
 * query with a verification_exception. The columns are resolved through ES|QL
 * itself (`FROM <pattern> | LIMIT 0`) rather than field caps, because field
 * caps does not surface all mapping conflicts that ES|QL rejects (e.g. a field
 * mapped as `object` in one index and `text` in another is reported by field
 * caps as a plain text field, but is an unsupported column in ES|QL).
 */
export function useQueryableFields({
  indexPattern,
  fields,
}: UseQueryableFieldsParams): UseQueryableFieldsResult {
  const {
    data: { search },
  } = getUnifiedDocViewerServices();
  const [result, setResult] = useState<UseQueryableFieldsResult>({ loading: true });
  const fieldsKey = [...fields].sort().join(',');

  useEffect(() => {
    const fieldNames = fieldsKey ? fieldsKey.split(',') : [];
    if (!indexPattern || fieldNames.length === 0) {
      setResult({ queryableFields: new Set(fieldNames), loading: false });
      return;
    }

    const abortController = new AbortController();
    setResult({ loading: true });

    getESQLQueryColumnsRaw({
      esqlQuery: `FROM ${indexPattern}`,
      search: search.search,
      signal: abortController.signal,
    })
      .then((columns) => {
        const queryableColumns = new Set(
          columns.filter((column) => column.type !== 'unsupported').map((column) => column.name)
        );
        setResult({
          queryableFields: new Set(fieldNames.filter((name) => queryableColumns.has(name))),
          loading: false,
        });
      })
      .catch(() => {
        if (abortController.signal.aborted) {
          return;
        }
        // Fail open: if column resolution is unavailable, keep the previous
        // behavior of querying all fields rather than hiding the feature.
        setResult({ queryableFields: new Set(fieldNames), loading: false });
      });

    return () => abortController.abort();
  }, [search, indexPattern, fieldsKey]);

  return result;
}
