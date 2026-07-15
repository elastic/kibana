/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { getUnifiedDocViewerServices } from '../../../../plugin';

export interface UseQueryableFieldsParams {
  indexPattern?: string;
  fields: string[];
}

export interface UseQueryableFieldsResult {
  /**
   * Fields that exist in the index pattern without conflicting mappings,
   * or `undefined` while resolution is in progress.
   */
  queryableFields?: Set<string>;
  loading: boolean;
}

/**
 * Resolves which of the given fields can be referenced as ES|QL columns in a
 * query against the given index pattern. A field is queryable only if it is
 * mapped in at least one matching index and its mappings do not conflict
 * across indices — referencing an unknown or ambiguous column makes the whole
 * ES|QL query fail with a verification_exception.
 */
export function useQueryableFields({
  indexPattern,
  fields,
}: UseQueryableFieldsParams): UseQueryableFieldsResult {
  const {
    data: { dataViews },
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

    dataViews
      // The request is intentionally not scoped with the `fields` option:
      // ES field_caps omits object-mapped parent fields when they are
      // requested by exact name, which would hide object-vs-leaf mapping
      // conflicts. Only the unscoped (wildcard) response lets Kibana mark
      // those fields as `conflict`.
      .getFieldsForWildcard({
        pattern: indexPattern,
        allowNoIndex: true,
        abortSignal: abortController.signal,
      })
      .then((specs) => {
        const queryableFields = new Set(
          specs.filter((spec) => spec.type !== 'conflict').map((spec) => spec.name)
        );
        setResult({ queryableFields, loading: false });
      })
      .catch(() => {
        if (abortController.signal.aborted) {
          return;
        }
        // Fail open: if field resolution is unavailable, keep the previous
        // behavior of querying all fields rather than hiding the feature.
        setResult({ queryableFields: new Set(fieldNames), loading: false });
      });

    return () => abortController.abort();
  }, [dataViews, indexPattern, fieldsKey]);

  return result;
}
