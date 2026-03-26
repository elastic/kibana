/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewsPublicPluginStart, MatchedItem } from '@kbn/data-views-plugin/public';
import type { ParsedMetricItem } from '../../../../types';

const extractDataStreamNames = (items: MatchedItem[]): Set<string> =>
  items.reduce<Set<string>>((acc, item) => {
    if (item.tags.some((tag) => tag.key === 'data_stream')) {
      acc.add(item.name);
    }
    return acc;
  }, new Set());

/**
 * Best-effort enrichment of metric items with data stream classification.
 * Uses the resolve_index API via dataViews.getIndices to determine which
 * sources are actual data streams vs plain indices.
 * On failure, items are returned unchanged (isDataStream defaults to true)
 * so the UI gracefully degrades to treating everything as a data stream.
 */
export const enrichWithDataStreamInfo = async (
  dataViews: DataViewsPublicPluginStart,
  metricItems: ParsedMetricItem[],
  uniqueNames: Set<string>
): Promise<ParsedMetricItem[]> => {
  if (uniqueNames.size === 0) {
    return metricItems;
  }

  try {
    const resolved = await dataViews.getIndices({
      pattern: [...uniqueNames].join(','),
      showAllIndices: true,
      isRollupIndex: () => false,
    });

    const dataStreamNames = extractDataStreamNames(resolved);

    return metricItems.map((item) => ({
      ...item,
      isDataStream: dataStreamNames.has(item.dataStream),
    }));
  } catch {
    // TODO: add monitoring/telemetry to track resolution failures
    return metricItems;
  }
};
