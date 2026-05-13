/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { rgbToHex, useEuiTheme } from '@elastic/eui';

export interface EuiColorToken {
  label: string;
  color: string;
}

/**
 * Returns an array of EUI theme color tokens with their token name and
 * resolved hex value. Useful for building a searchable color selector.
 */
export const useEuiColorTokens = (): EuiColorToken[] => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const tokens: EuiColorToken[] = [];
    const colors = euiTheme.colors as Record<string, unknown>;

    for (const [key, value] of Object.entries(colors)) {
      if (typeof value !== 'string') continue;
      const hex = toHex(value);
      if (hex) {
        tokens.push({ label: key, color: hex });
      }
    }

    return tokens;
  }, [euiTheme.colors]);
};

const toHex = (value: string): string | null => {
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) {
    return value.toLowerCase();
  }
  if (value.startsWith('rgb')) {
    try {
      return rgbToHex(value).toLowerCase();
    } catch {
      return null;
    }
  }
  return null;
};
