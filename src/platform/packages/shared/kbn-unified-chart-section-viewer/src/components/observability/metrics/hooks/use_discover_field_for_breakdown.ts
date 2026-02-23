/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';
import { MAX_DIMENSIONS_SELECTIONS } from '../../../../common/constants';
import type { Dimension } from '../../../../types';

export function useDiscoverFieldForBreakdown(
  breakdownField: string | undefined,
  dimensions: Dimension[],
  selectedDimensions: Dimension[],
  onDimensionsChange: (dimensions: Dimension[]) => void
) {
  // Helper function to sync breakdownField to selectedDimensions
  const syncBreakdownFieldToDimensions = useCallback(() => {
    const matchingDimension = getMatchingDimension(breakdownField, dimensions, selectedDimensions);

    // Update selection
    if (matchingDimension) {
      onDimensionsChange(
        [
          ...selectedDimensions.filter((dimension) => dimension.name !== matchingDimension.name),
          matchingDimension,
        ].slice(-MAX_DIMENSIONS_SELECTIONS)
      );
    }
  }, [breakdownField, dimensions, selectedDimensions, onDimensionsChange]);

  // Track previous breakdownField to detect transitions.
  const prevBreakdownFieldRef = useRef<string | undefined>(breakdownField);
  const prevHasMatchingDimensionRef = useRef(
    hasMatchingDimensionForBreakdown(breakdownField, dimensions)
  );
  const isFirstRenderRef = useRef(true);

  // Sync only on edges:
  // 1) breakdownField changes, or
  // 2) same breakdownField becomes selectable after dimensions update.
  useEffect(() => {
    const hasBreakdownFieldChanged = prevBreakdownFieldRef.current !== breakdownField;
    const hasMatchingDimension = hasMatchingDimensionForBreakdown(breakdownField, dimensions);
    const hasDimensionBecomeAvailable =
      !hasBreakdownFieldChanged && !prevHasMatchingDimensionRef.current && hasMatchingDimension;

    const shouldSync =
      isFirstRenderRef.current || hasBreakdownFieldChanged || hasDimensionBecomeAvailable;

    if (shouldSync && breakdownField) {
      syncBreakdownFieldToDimensions();
    }

    isFirstRenderRef.current = false;
    prevBreakdownFieldRef.current = breakdownField;
    prevHasMatchingDimensionRef.current = hasMatchingDimension;
  }, [breakdownField, dimensions, syncBreakdownFieldToDimensions]);
}

function hasMatchingDimensionForBreakdown(
  breakdownField: string | undefined,
  dimensions: Dimension[]
): boolean {
  return Boolean(
    breakdownField && dimensions.some((dimension) => dimension.name === breakdownField)
  );
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
