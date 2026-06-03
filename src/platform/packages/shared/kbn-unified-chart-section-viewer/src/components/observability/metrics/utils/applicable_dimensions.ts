/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dimension, ParsedMetricItem } from '../../../../types';
import { getMetricUniqueKey } from '../../../../common/utils';

// Shared empty list, never mutated
export const EMPTY_APPLICABLE_DIMENSIONS: Dimension[] = [];

export const haveSameDimensionNames = (previous: Dimension[], next: Dimension[]): boolean =>
  previous.length === next.length &&
  previous.every((dimension, index) => dimension.name === next[index].name);

/**
 * Pre-computes applicable breakdown dimensions per metric and reuses previous
 * array references when the selected dimension names for a metric are unchanged.
 */
export const stabilizeApplicableDimensionsPerItem = (
  metricItems: ParsedMetricItem[],
  dimensionNameSet: Set<string>,
  cacheByMetricKey: Map<string, Dimension[]>
): Dimension[][] => {
  const currentMetricKeys = new Set(metricItems.map((item) => getMetricUniqueKey(item)));

  for (const metricKey of cacheByMetricKey.keys()) {
    if (!currentMetricKeys.has(metricKey)) {
      cacheByMetricKey.delete(metricKey);
    }
  }

  return metricItems.map((item) => {
    const nextApplicableDimensions = item.dimensionFields.filter((dimensionField) =>
      dimensionNameSet.has(dimensionField.name)
    );
    const metricKey = getMetricUniqueKey(item);
    const previousApplicableDimensions = cacheByMetricKey.get(metricKey);

    if (
      previousApplicableDimensions &&
      haveSameDimensionNames(previousApplicableDimensions, nextApplicableDimensions)
    ) {
      return previousApplicableDimensions;
    }

    const stabilizedApplicableDimensions =
      nextApplicableDimensions.length === 0
        ? EMPTY_APPLICABLE_DIMENSIONS
        : nextApplicableDimensions;

    cacheByMetricKey.set(metricKey, stabilizedApplicableDimensions);
    return stabilizedApplicableDimensions;
  });
};
