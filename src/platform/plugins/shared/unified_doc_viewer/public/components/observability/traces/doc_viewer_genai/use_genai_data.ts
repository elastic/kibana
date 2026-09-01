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
}

/**
 * Derives GenAI fields from a doc viewer record.
 *
 * The `attributes.*` keyword mappings use `ignore_above: 1024`, so long
 * prompt/response values are dropped from the fields API (and flagged in
 * `_ignored`) while surviving in `_source`. This hook restores them in two
 * steps:
 * 1. merge from `hit.raw._source` when the record carries it (e.g. hits built
 *    from the APM span route or the single-doc page), then
 * 2. when `_source` is absent (Discover grid records are fetched with
 *    `_source: false`), run a targeted search for just those fields.
 */
export function useGenAiData({ hit }: { hit: DataTableRecord }): UseGenAiDataResult {
  const { metadata, missingLongFields } = useMemo(() => {
    const merged: Record<string, unknown> = { ...hit.flattened };
    const ignored = hit.raw._ignored ?? [];
    const missing: string[] = [];

    for (const fieldName of GEN_AI_LONG_MESSAGE_FIELDS) {
      if (merged[fieldName] == null || ignored.includes(fieldName)) {
        const sourceValue = getFieldFromSource(hit.raw._source, fieldName);
        if (sourceValue != null) {
          merged[fieldName] = castArray(sourceValue);
        } else if (ignored.includes(fieldName)) {
          missing.push(fieldName);
        }
      }
    }

    return { metadata: merged, missingLongFields: missing };
  }, [hit]);

  const isGenAiSpan = useMemo(() => hasGenAiData(metadata), [metadata]);

  const docId = hit.raw._id;
  const docIndex = hit.raw._index;
  const shouldFetch = isGenAiSpan && missingLongFields.length > 0 && !!docId && !!docIndex;

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
          merged[fieldName] = castArray(sourceValue);
        }
      }
    }

    return getGenAiFields(merged);
  }, [isGenAiSpan, metadata, fetchedSource, missingLongFields]);

  return { genAi, isGenAiSpan, loading: shouldFetch && loading };
}
