/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import type { DataViewsPublicPluginStart, MatchedItem } from '@kbn/data-views-plugin/public';
import { useExternalServices } from '../../../context/external_services';

// Tag key emitted by data_views.getIndices() / responseToItemArray for plain
// indices (vs data streams). Coupled to that plugin's response shape.
// TODO: import from @kbn/data-views-plugin once exported
// (https://github.com/elastic/kibana/issues/265126).
const DATA_VIEWS_INDEX_TAG_KEY = 'index';

export const METRIC_SOURCE_KIND = {
  DATA_STREAM: 'data_stream',
  INDEX: 'index',
} as const;

export type MetricSourceKind = (typeof METRIC_SOURCE_KIND)[keyof typeof METRIC_SOURCE_KIND];

export interface UseMetricSourceKindResult {
  kind: MetricSourceKind;
}

/**
 * Classifies a metric source via `dataViews.getIndices` (`_resolve/index`).
 * Best-effort: returns `fallbackKind` whenever the kind cannot be determined
 * (missing `dataViews`, missing `name`, request in flight, fetch error, or
 * source not found in the response). Only flips when the response confirms a
 * different kind.
 */
export const useMetricSourceKind = (
  name: string | undefined,
  fallbackKind: MetricSourceKind
): UseMetricSourceKindResult => {
  const dataViews = useExternalServices()?.dataViews;
  const [{ value }, resolve] = useAsyncFn(resolveSourceKind, []);

  useEffect(() => {
    if (!dataViews || !name) return;
    resolve(dataViews, name);
  }, [dataViews, name, resolve]);

  if (!dataViews || !name || !value || value.name !== name) {
    return { kind: fallbackKind };
  }
  return { kind: value.kind ?? fallbackKind };
};

interface ClassifiedSource {
  name: string;
  kind: MetricSourceKind | undefined;
}

// Module-level cache deduplicates concurrent classifications by source name.
// We cache the in-flight promise (not the resolved value) so two consumers
// asking for the same name during the same render share the same fetch:
// caching the resolved value would require awaiting first, and by then the
// other consumers would have already issued their own `_resolve/index` call.
//
// Lives for the browser session and is cleared on any full page reload,
// including switching Kibana spaces. A refresh (or space change) is enough
// to re-resolve every source.
const cache = new Map<string, Promise<MetricSourceKind | undefined>>();

/**
 * Clears the cache above. Call when previous classifications are known to
 * be stale (e.g. between tests).
 */
export const resetMetricSourceKindCache = () => {
  cache.clear();
};

const resolveSourceKind = async (
  dataViews: DataViewsPublicPluginStart,
  name: string
): Promise<ClassifiedSource> => {
  let pending = cache.get(name);
  if (!pending) {
    pending = fetchSourceKind(dataViews, name);
    cache.set(name, pending);
    // Negative-cache eviction: `getIndices` swallows HTTP errors as `[]`, so a
    // resolved-with-undefined hides both real failures and transient states
    // (data stream being created, cross-cluster permissions propagating, etc.)
    // Evict so the next consumer retries instead of pinning the session-long fallback.
    pending
      .then((kind) => {
        if (kind === undefined && cache.get(name) === pending) cache.delete(name);
      })
      .catch(() => {
        if (cache.get(name) === pending) cache.delete(name);
      });
  }
  try {
    return { name, kind: await pending };
  } catch {
    // TODO: add monitoring/telemetry to track resolution failures
    // (https://github.com/elastic/kibana/issues/265117)
    return { name, kind: undefined };
  }
};

const fetchSourceKind = async (
  dataViews: DataViewsPublicPluginStart,
  name: string
): Promise<MetricSourceKind | undefined> => {
  const matched: MatchedItem[] = await dataViews.getIndices({
    pattern: name,
    showAllIndices: true,
    isRollupIndex: () => false,
  });
  const item = matched.find((m) => m.name === name);
  if (!item) return undefined;
  return item.tags.some((t) => t.key === DATA_VIEWS_INDEX_TAG_KEY)
    ? METRIC_SOURCE_KIND.INDEX
    : METRIC_SOURCE_KIND.DATA_STREAM;
};
