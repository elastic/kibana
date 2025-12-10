/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useMetricsExperienceFieldsCapsContext } from '../context/metrics_experience_fields_caps_provider';

/**
 * Extracts dimension values for specific indices and selected dimensions.
 * Calls getRowsByDimension() on demand.
 */
export const useExtractDimensionsValues = ({ dimensionNames }: { dimensionNames: string[] }) => {
  const { getValuesByDimension } = useMetricsExperienceFieldsCapsContext();

  const valuesByDimension = useMemo(() => {
    return getValuesByDimension(dimensionNames);
  }, [dimensionNames, getValuesByDimension]);

  return useMemo(() => {
    if (valuesByDimension.size === 0) {
      return new Map<string, Map<string, Set<string>>>();
    }

    const result = new Map<string, Map<string, Set<string>>>();

    for (const [key, values] of valuesByDimension.entries()) {
      result.set(key, values);
    }

    return result;
  }, [valuesByDimension]);
};
