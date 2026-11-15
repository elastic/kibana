/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useEuiTheme, euiFontSizeFromScale } from '@elastic/eui';

/** EUI's documented font-size scale keys, smallest to largest. */
const FONT_SCALES = ['xxxs', 'xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl'] as const;

/**
 * Builds a memoized reverse lookup from EUI font-size scale pixel values to
 * scale token keys (e.g. `14 → "s"`), computed live from the current EUI
 * theme via `euiFontSizeFromScale` so it stays correct under theme overrides.
 *
 * @returns A map from pixel value to EUI font scale token key.
 */
export const useEuiFontScaleLookup = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const lookup = new Map<number, string>();
    for (const scale of FONT_SCALES) {
      const px = euiFontSizeFromScale(scale, euiTheme, { unit: 'px' });
      const parsed = parseInt(px, 10);
      if (!isNaN(parsed)) {
        lookup.set(parsed, scale);
      }
    }
    return lookup;
  }, [euiTheme]);
};
