/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sortBy } from 'lodash';
import type { SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import type { Dimension } from '../../types';

interface OptionDisabledStateParams {
  singleSelection: boolean;
  isSelected: boolean;
  isIntersecting: boolean;
  isAtMaxLimit: boolean;
}

const SORT_PRIORITY = {
  SELECTED: 0,
  NOT_SELECTED: 1,
} as const;

/**
 * Determines if a dimension option should be disabled.
 * - In single-selection mode: never disabled
 * - Selected items: never disabled (can always deselect)
 * - Otherwise: disabled if not intersecting or at max limit
 */
export const getOptionDisabledState = ({
  singleSelection,
  isSelected,
  isIntersecting,
  isAtMaxLimit,
}: OptionDisabledStateParams): boolean => {
  if (singleSelection) return false;
  if (isSelected) return false;
  return !isIntersecting || isAtMaxLimit;
};

/**
 * Sorts dimension options: Selected first (in selection order),
 * then available and disabled together (alphabetically).
 */
export const sortDimensionOptions = (
  options: SelectableEntry[],
  selectedDimensions: Dimension[]
): SelectableEntry[] => {
  const selectionOrderMap = new Map(selectedDimensions.map((dim, index) => [dim.name, index]));

  return sortBy(options, [
    (option) => {
      if (option.checked === 'on') return SORT_PRIORITY.SELECTED;
      return SORT_PRIORITY.NOT_SELECTED;
    },
    (option) => {
      if (option.checked === 'on') {
        return selectionOrderMap.get(option.value) ?? Infinity;
      }
      return option.label.toLowerCase();
    },
  ]);
};
