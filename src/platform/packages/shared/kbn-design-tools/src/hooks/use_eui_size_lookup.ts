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
 * Builds a memoized reverse lookup from EUI size pixel values to token keys.
 *
 * @returns A map from pixel value to EUI size token key (e.g. `16 → "m"`).
 */
export const useEuiSizeLookup = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const lookup = new Map<number, string>();
    for (const [key, value] of Object.entries(euiTheme.size)) {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        lookup.set(parsed, key);
      }
    }
    return lookup;
  }, [euiTheme.size]);
};
