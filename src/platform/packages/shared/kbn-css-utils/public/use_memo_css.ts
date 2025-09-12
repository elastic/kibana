/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import type { Interpolation } from '@emotion/react';
import { useMemo } from 'react';

export type EmotionStyles = Record<string, Interpolation | ((theme: UseEuiTheme) => Interpolation)>;

/**
 * Custom hook to reduce boilerplate when working with Emotion styles that may depend on
 * the EUI theme.
 *
 * Accepts a map of styles where each entry is either a static Emotion style (via `css`)
 * or a function that returns styles based on the current `euiTheme`.
 *
 * It returns a memoized version of the style map with all values resolved to static
 * Emotion styles, allowing components to use a clean and unified object for styling.
 *
 * This helps simplify component code by centralizing theme-aware style logic.
 *
 * Example usage:
 *   const componentStyles = {
 *     container: css({ overflow: hidden }),
 *     leftPane: ({ euiTheme }) => css({ paddingTop: euiTheme.size.m }),
 *   }
 *   const styles = useMemoCss(componentStyles);
 */
export const useMemoCss = <T extends EmotionStyles>(
  styleMap: T
): { [K in keyof T]: Interpolation } => {
  const euiThemeContext = useEuiTheme();

  const outputStyles = useMemo(() => {
    return Object.entries(styleMap).reduce<{ [K in keyof T]: Interpolation }>(
      (acc, [key, value]) => {
        acc[key as keyof T] = typeof value === 'function' ? value(euiThemeContext) : value;
        return acc;
      },
      {} as { [K in keyof T]: Interpolation }
    );
  }, [euiThemeContext, styleMap]);

  return outputStyles;
};
