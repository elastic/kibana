/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useRef } from 'react';
import type { Dimension, ParsedMetricItem } from '../../../../types';
import { stabilizeApplicableDimensionsPerItem } from '../utils/applicable_dimensions';

/**
 * Returns per-metric applicable breakdown dimensions with stable array references
 * when a metric's selected dimension names are unchanged.
 */
export const useApplicableDimensionsPerItem = (
  metricItems: ParsedMetricItem[],
  dimensions: Dimension[]
): Dimension[][] => {
  const cacheByMetricKeyRef = useRef<Map<string, Dimension[]>>(new Map());

  const dimensionNameSet = useMemo(
    () => new Set(dimensions.map((dimension) => dimension.name)),
    [dimensions]
  );

  return useMemo(
    () =>
      stabilizeApplicableDimensionsPerItem(
        metricItems,
        dimensionNameSet,
        cacheByMetricKeyRef.current
      ),
    [metricItems, dimensionNameSet]
  );
};
