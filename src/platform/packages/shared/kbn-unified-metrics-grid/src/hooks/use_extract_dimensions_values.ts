/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useMetricFieldsCapsContext } from '../context/metric_fields_caps_provider';
import type { FieldSpecId } from '../common/utils';
import { buildFieldSpecId } from '../common/utils';

/**
 * Extracts dimension values for specific indices and selected dimensions.
 * Calls getRowsByDimension() on demand.
 */
export const useExtractDimensionsValues = ({
  indices,
  dimensionNames,
}: {
  indices: string[];
  dimensionNames: string[];
}) => {
  const { getValuesByDimension } = useMetricFieldsCapsContext();

  const requiredDimensionFields = useMemo(() => {
    return dimensionNames.flatMap((dimName) =>
      indices.map((index) => buildFieldSpecId(index, dimName))
    );
  }, [indices, dimensionNames]);

  const valuesByDimension = useMemo(() => {
    return getValuesByDimension(requiredDimensionFields);
  }, [requiredDimensionFields, getValuesByDimension]);

  return useMemo(() => {
    if (valuesByDimension.size === 0) {
      return new Map<string, Map<string, Set<FieldSpecId>>>();
    }

    const result = new Map<string, Map<string, Set<FieldSpecId>>>();

    for (const [key, values] of valuesByDimension.entries()) {
      result.set(key, values);
    }

    return result;
  }, [valuesByDimension]);
};
