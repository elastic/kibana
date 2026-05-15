/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewsPublicPluginStart, MatchedItem } from '@kbn/data-views-plugin/public';
import { useAbortableAsync } from '@kbn/react-hooks';
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

export interface UseMetricSourceKindParams {
  name: string | undefined;
  fallback: MetricSourceKind;
}

export interface UseMetricSourceKindResult {
  kind: MetricSourceKind;
}

/**
 * Classifies a metric source via `dataViews.getIndices` (`_resolve/index`).
 * Best-effort: returns `fallback` whenever the kind cannot be determined
 * (missing `dataViewsService`, missing `name`, request in flight, fetch error,
 * or source not found in the response). Only flips when the response confirms
 * a different kind for the current `name`.
 *
 * Multiple consumers asking for the same `name` share a single in-flight
 * request via the module-level cache below.
 */
export const useMetricSourceKind = ({
  name,
  fallback,
}: UseMetricSourceKindParams): UseMetricSourceKindResult => {
  const dataViewsService = useExternalServices()?.dataViews;

  const { value } = useAbortableAsync<ClassifiedSource | undefined>(async () => {
    if (!dataViewsService || !name) return undefined;
    return resolveSourceKind(dataViewsService, name);
  }, [dataViewsService, name]);

  // Guard against stale results: `useAbortableAsync` keeps the previous value
  // while a new request is in flight, so without this check we could briefly
  // expose the previous source's kind on a different name.
  if (!value || value.name !== name) {
    return { kind: fallback };
  }
  return { kind: value.kind ?? fallback };
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
  dataViewsService: DataViewsPublicPluginStart,
  name: string
): Promise<ClassifiedSource> => {
  let pending = cache.get(name);
  if (!pending) {
    pending = fetchSourceKind(dataViewsService, name);
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
  dataViewsService: DataViewsPublicPluginStart,
  name: string
): Promise<MetricSourceKind | undefined> => {
  const matched: MatchedItem[] = await dataViewsService.getIndices({
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
