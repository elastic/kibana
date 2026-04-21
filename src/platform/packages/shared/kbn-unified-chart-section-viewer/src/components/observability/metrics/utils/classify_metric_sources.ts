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

const extractDataStreamNames = (items: MatchedItem[]): Set<string> =>
  items.reduce<Set<string>>((acc, item) => {
    if (item.tags.some((tag) => tag.key === 'data_stream')) {
      acc.add(item.name);
    }
    return acc;
  }, new Set());

/**
 * Classifies metric sources as either `'data_stream'` or `'index'` using the
 * resolve_index API via dataViews.getIndices, producing fully-typed
 * `ParsedMetricItem`s from `UnclassifiedMetricItem`s.
 *
 * Owns the `sourceKind` invariant on every path:
 * - empty uniqueSources: stamps `options.fallbackKind` on every item
 * - success: stamps `'data_stream'` or `'index'` per item based on resolved
 *   data_stream tags
 * - failure (network / permission): stamps `options.fallbackKind`
 *
 * Callers express their failure preference at the call site via
 * `options.fallbackKind`.
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
