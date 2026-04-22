/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewsPublicPluginStart, MatchedItem } from '@kbn/data-views-plugin/public';
import type { MetricSourceKind, ParsedMetricItem, UnclassifiedMetricItem } from '../../../../types';

// The 'data_stream' tag key is set by the data_views plugin when transforming
// the Elasticsearch _resolve/index response into MatchedItem[]. See:
// https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/data_views/public/services/get_indices.ts#L160-L166
//
// TODO: Replace this string literal with a constant
// exported from @kbn/data-views-plugin so both producer and consumer share
// the same source of truth and a rename can't silently break this check.
const DATA_STREAM_TAG_KEY = 'data_stream';

const extractDataStreamNames = (items: MatchedItem[]): Set<string> =>
  items.reduce<Set<string>>((acc, item) => {
    if (item.tags.some((tag) => tag.key === DATA_STREAM_TAG_KEY)) {
      acc.add(item.name);
    }
    return acc;
  }, new Set());

/**
 * Classifies metric sources as `'data_stream'` or `'index'` via the
 * `_resolve/index` API. Best-effort: never throws — items fall back to
 * `options.fallbackKind` when `uniqueSources` is empty, or when resolution
 * can't run or fails.
 */
export const classifyMetricSources = async (
  dataViews: DataViewsPublicPluginStart,
  metricItems: UnclassifiedMetricItem[],
  uniqueSources: ReadonlySet<string>,
  options: { fallbackKind: MetricSourceKind }
): Promise<ParsedMetricItem[]> => {
  if (uniqueSources.size === 0) {
    return metricItems.map((item) => ({ ...item, sourceKind: options.fallbackKind }));
  }

  try {
    // Single _resolve/index call for all unique source names.
    // showAllIndices covers hidden backing indices (.ds-*) for correct
    // data stream detection. The comma-joined pattern is unlikely to be
    // a problem in practice because of the quantity of unique sources,
    // but if it ever is, we'll address it then.
    const resolved = await dataViews.getIndices({
      pattern: [...uniqueSources].join(','),
      showAllIndices: true,
      isRollupIndex: () => false,
    });

    const dataStreamNames = extractDataStreamNames(resolved);

    return metricItems.map((item) => ({
      ...item,
      sourceKind: dataStreamNames.has(item.dataStream) ? 'data_stream' : 'index',
    }));
  } catch {
    // TODO: add monitoring/telemetry to track resolution failures
    return metricItems.map((item) => ({ ...item, sourceKind: options.fallbackKind }));
  }
};
