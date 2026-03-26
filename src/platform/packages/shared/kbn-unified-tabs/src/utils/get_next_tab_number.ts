/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TabItem } from '../types';

export const getNextTabNumber = (allTabs: TabItem[], baseLabel: string) => {
  // Find the highest number among tabs with the base label
  const maxNumber = allTabs.reduce((max, tab) => {
    const label = tab.label.trim();

    // Check if this is the base label without a number (implicit "1")
    if (label === baseLabel) {
      return Math.max(max, 1);
    }

    // Check if this is a numbered variant like "Base Label 2"
    if (label.startsWith(`${baseLabel} `)) {
      // Extract the number part after "Base Label "
      const suffix = label.slice(baseLabel.length + 1);
      const num = Number(suffix);

      // Only consider valid numbers
      if (!isNaN(num)) {
        return Math.max(max, num);
      }
    }

    // Tab doesn't match our pattern, keep current max
    return max;
  }, 0); // Start with 0 as initial max

  // Return next number if we found any matching tabs, otherwise null
  return maxNumber > 0 ? maxNumber + 1 : null;
};
