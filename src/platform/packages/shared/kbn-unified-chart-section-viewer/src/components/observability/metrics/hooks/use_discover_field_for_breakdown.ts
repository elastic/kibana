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

export const useDiscoverFieldForBreakdown = (
  breakdownField: string | undefined,
  dimensions: Dimension[],
  selectedDimensions: Dimension[],
  onDimensionsChange: (dimensions: Dimension[]) => void
) => {
  const isFirstRenderRef = useRef(true);
  const previousBreakdownFieldRef = useRef(breakdownField);
  const pendingBreakdownFieldRef = useRef<string>();

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;

      if (selectedDimensions.length === 0 && breakdownField) {
        onDimensionsChange([{ name: breakdownField }]);
      }

      return;
    }

    if (previousBreakdownFieldRef.current !== breakdownField) {
      previousBreakdownFieldRef.current = breakdownField;
      pendingBreakdownFieldRef.current = breakdownField;
    }

    const pendingBreakdownField = pendingBreakdownFieldRef.current;
    const matchingDimension = dimensions.find(({ name }) => name === pendingBreakdownField);

    if (!matchingDimension) {
      return;
    }

    pendingBreakdownFieldRef.current = undefined;

    if (selectedDimensions.some(({ name }) => name === matchingDimension.name)) {
      return;
    }

    onDimensionsChange(
      [...selectedDimensions, matchingDimension].slice(-MAX_DIMENSIONS_SELECTIONS)
    );
  }, [breakdownField, dimensions, onDimensionsChange, selectedDimensions]);
};
