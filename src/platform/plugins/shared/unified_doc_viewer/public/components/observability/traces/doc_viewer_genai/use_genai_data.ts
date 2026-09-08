/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  GEN_AI_LONG_MESSAGE_FIELDS,
  getFieldFromSource,
  getGenAiFields,
  hasGenAiData,
  type GenAiFields,
} from '@kbn/apm-ui-shared';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useAbortableAsync } from '@kbn/react-hooks';
import { castArray } from 'lodash';
import { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { getUnifiedDocViewerServices } from '../../../../plugin';

export interface UseGenAiDataResult {
  /** Parsed GenAI fields, or undefined when the document has no gen_ai data. */
  genAi: GenAiFields | undefined;
  /** True when the document carries any gen_ai attribute. */
  isGenAiSpan: boolean;
  /** True while long message values are being fetched from `_source`. */
  loading: boolean;
  /**
   * True when message values are absent and cannot be recovered because the
   * record has no `_id`/`_index` to refetch by — an ES|QL row queried without
   * `METADATA _id, _index`.
   */
  unrecoverableLongFields: boolean;
}

/**
 * Derives GenAI fields from a doc viewer record, restoring long message values
 * that `ignore_above: 1024` dropped from the index but left in `_source`.
 *
 * Values are read from `hit.raw._source` when the record carries it, otherwise
 * refetched by `_id`. Arming that refetch differs by data source: in DSL
 * `_ignored` is authoritative, while ES|QL rows carry it only with
 * `METADATA _ignored` — and refetching at all needs `METADATA _id, _index`.
 */
export function useGenAiData({
  hit,
  isEsqlMode = false,
}: {
  hit: DataTableRecord;
  isEsqlMode?: boolean;
}): UseGenAiDataResult {
  const { metadata, missingLongFields } = useMemo(() => {
    const merged: Record<string, unknown> = { ...hit.flattened };
    // castArray because ES|QL returns a single-valued `_ignored` column as a
    // bare string, which would break the `.some()` below.
    const ignoredList = castArray(hit.raw._ignored ?? []);
    const missing: string[] = [];

    const isIgnored = (fieldName: string) =>
      ignoredList.includes(fieldName) ||
      // Container-level entry, e.g. `['attributes']` for `attributes.gen_ai.*`.
      ignoredList.some((ancestor) => fieldName.startsWith(`${ancestor}.`));

    // ES|QL rows carry every requested column as a key, so a present-but-empty
    // `_ignored` proves nothing was dropped; only its absence is inconclusive.
    const ignoredUnknown = isEsqlMode && !('_ignored' in hit.raw);

    for (const fieldName of GEN_AI_LONG_MESSAGE_FIELDS) {
      // `ignoredUnknown` also enters here for a present value: these fields are
      // multi-valued and `ignore_above` drops only the over-long elements, so
      // without `_ignored` a non-null array cannot be assumed complete.
      if (merged[fieldName] == null || isIgnored(fieldName) || ignoredUnknown) {
        const sourceValue = getFieldFromSource(hit.raw._source, fieldName);
        if (sourceValue != null) {
          merged[fieldName] = castArray(sourceValue);
        } else if (isIgnored(fieldName) || ignoredUnknown) {
          missing.push(fieldName);
        }
      }
    }

    return { metadata: merged, missingLongFields: missing };
  }, [hit, isEsqlMode]);

  const isGenAiSpan = useMemo(() => hasGenAiData(metadata), [metadata]);

  const docId = hit.raw._id;
  const docIndex = hit.raw._index;
  const hasMissing = isGenAiSpan && missingLongFields.length > 0;
  const shouldFetch = hasMissing && !!docId && !!docIndex;
  const unrecoverableLongFields = hasMissing && (!docId || !docIndex);

  const { value: fetchedSource, loading } = useAbortableAsync(
    async ({ signal }) => {
      if (!shouldFetch || !docId || !docIndex) {
        return undefined;
      }

      const { data } = getUnifiedDocViewerServices();
      const result = await lastValueFrom(
        data.search.search(
          {
            params: {
              index: docIndex,
              size: 1,
              query: {
                bool: {
                  filter: [{ ids: { values: [docId] } }],
                },
              },
              _source: [...GEN_AI_LONG_MESSAGE_FIELDS],
            },
          },
          { abortSignal: signal }
        )
      );

      return result.rawResponse.hits.hits[0]?._source as Record<string, unknown> | undefined;
    },
    [shouldFetch, docId, docIndex]
  );

  const genAi = useMemo(() => {
    if (!isGenAiSpan) {
      return undefined;
    }

    const merged = { ...metadata };
    if (fetchedSource) {
      for (const fieldName of missingLongFields) {
        const sourceValue = getFieldFromSource(fetchedSource, fieldName);
        if (sourceValue != null) {
          // Replaces the whole field: synthetic `_source` returns multi-valued
          // keywords sorted and de-duplicated, so elements cannot be aligned
          // with the partially-indexed value.
          merged[fieldName] = castArray(sourceValue);
        }
      }
    }

    return getGenAiFields(merged);
  }, [isGenAiSpan, metadata, fetchedSource, missingLongFields]);

  return { genAi, isGenAiSpan, loading: shouldFetch && loading, unrecoverableLongFields };
}
