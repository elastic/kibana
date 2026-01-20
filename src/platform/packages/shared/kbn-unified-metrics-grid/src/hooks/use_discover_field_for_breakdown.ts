/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';
import { MAX_DIMENSIONS_SELECTIONS } from '../common/constants';
import type { Dimension } from '../types';

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
        [matchingDimension, ...selectedDimensions].slice(0, MAX_DIMENSIONS_SELECTIONS)
      );
    }
  }, [breakdownField, dimensions, selectedDimensions, onDimensionsChange]);

  // Track previous breakdownField to detect changes
  const prevBreakdownFieldRef = useRef<string | undefined>(breakdownField);

  // Sync breakdownField to selectedDimensions when it changes or dimensions become available
  useEffect(() => {
    const hasBreakdownFieldChanged = prevBreakdownFieldRef.current !== breakdownField;

    if (hasBreakdownFieldChanged) {
      prevBreakdownFieldRef.current = breakdownField;
    }

    // Only sync if breakdownField is set and dimensions are available
    if (breakdownField && dimensions.length > 0) {
      syncBreakdownFieldToDimensions();
    }
  }, [breakdownField, dimensions, syncBreakdownFieldToDimensions]);
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
