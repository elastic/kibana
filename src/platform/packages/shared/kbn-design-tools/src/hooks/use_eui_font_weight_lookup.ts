/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';

/**
 * Builds a memoized reverse lookup from EUI font-weight numeric values to
 * token keys.
 *
 * @returns A map from font-weight number to EUI font weight token key (e.g. `400 → "regular"`).
 */
export const useEuiFontWeightLookup = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const lookup = new Map<number, string>();
    for (const [key, value] of Object.entries(euiTheme.font.weight)) {
      if (typeof value === 'number') {
        lookup.set(value, key);
      }
    }
    return lookup;
  }, [euiTheme.font.weight]);
};
