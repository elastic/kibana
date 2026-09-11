/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import { MAX_DIMENSIONS_SELECTIONS } from '../../../../common/constants';
import type { Dimension } from '../../../../types';

export function useDiscoverFieldForBreakdown(
  breakdownField: string | undefined,
  dimensions: Dimension[],
  selectedDimensions: Dimension[],
  onDimensionsChange: (dimensions: Dimension[]) => void
) {
  const previousBreakdownFieldRef = useRef(breakdownField);
  const pendingBreakdownFieldRef = useRef(
    selectedDimensions.length === 0 ? breakdownField : undefined
  );

  useEffect(() => {
    if (previousBreakdownFieldRef.current !== breakdownField) {
      previousBreakdownFieldRef.current = breakdownField;
      pendingBreakdownFieldRef.current = breakdownField;
    }

    const matchingDimension = getMatchingDimension(
      pendingBreakdownFieldRef.current,
      dimensions,
      selectedDimensions
    );

    if (!matchingDimension) {
      return;
    }

    pendingBreakdownFieldRef.current = undefined;
    onDimensionsChange(
      [
        ...selectedDimensions.filter((dimension) => dimension.name !== matchingDimension.name),
        matchingDimension,
      ].slice(-MAX_DIMENSIONS_SELECTIONS)
    );
  }, [breakdownField, dimensions, onDimensionsChange, selectedDimensions]);
}

function getMatchingDimension(
  breakdownField: string | undefined,
  dimensions: Dimension[],
  selectedDimensions: Dimension[]
): Dimension | undefined {
  if (!breakdownField || dimensions.length === 0) return;
  const matchingDimension = dimensions.find((d) => d.name === breakdownField);
  return matchingDimension && selectedDimensions.some((d) => d.name === breakdownField)
    ? undefined
    : matchingDimension;
}
