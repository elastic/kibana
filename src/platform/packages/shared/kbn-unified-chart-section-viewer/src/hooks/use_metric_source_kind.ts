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
import { useExternalServices } from '../context/external_services';

/**
 * Source kinds the metrics flyout knows about. `INDEX` doubles as the tag key
 * produced by the data_views plugin's `responseToItemArray` for plain indices,
 * so we can compare against it directly when reading `_resolve/index` results.
 * See:
 * https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/data_views/public/services/get_indices.ts
 *
 * TODO: Replace this string literal with a constant exported from
 * @kbn/data-views-plugin so producer and consumer share the same source of
 * truth. See https://github.com/elastic/kibana/issues/265126
 */
export const METRIC_SOURCE_KIND = {
  DATA_STREAM: 'data_stream',
  INDEX: 'index',
} as const;

export type MetricSourceKind = 'data_stream' | 'index';

export interface UseMetricSourceKindResult {
  kind: MetricSourceKind;
}

/**
 * Classifies a metric source via `dataViews.getIndices` (`_resolve/index`).
 * Best-effort: returns `fallbackKind` for every "I don't know yet" case (no
 * `dataViews`, no `name`, in flight, fetch error, source not found). Only
 * flips when the response confirms a different kind. Caller owns the
 * optimistic default, which lets the hook stay a pure classifier with no
 * flicker.
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

const resolveSourceKind = async (
  dataViews: DataViewsPublicPluginStart,
  name: string
): Promise<ClassifiedSource> => {
  let pending = cache.get(name);
  if (!pending) {
    pending = fetchSourceKind(dataViews, name);
    cache.set(name, pending);
    pending.catch(() => {
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
  return item.tags.some((t) => t.key === METRIC_SOURCE_KIND.INDEX)
    ? METRIC_SOURCE_KIND.INDEX
    : METRIC_SOURCE_KIND.DATA_STREAM;
};
