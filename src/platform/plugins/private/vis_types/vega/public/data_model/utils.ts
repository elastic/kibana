/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { prettyCompactStringify } from '@kbn/std';
import type { CoreTheme } from '@kbn/core/public';
import { transparentize } from '@elastic/eui';
import { getEuiThemeVars } from '@kbn/ui-theme';
import type { Color, Gradient } from 'vega';
import { normalizeObject } from '../vega_view/utils';

function normalizeAndStringify(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }
  return prettyCompactStringify(normalizeObject(value), { maxLength: 70 });
}

export class Utils {
  /**
   * If the 2nd array parameter in args exists, append it to the warning/error string value
   */
  static formatWarningToStr(...args: any[]): string {
    const value = normalizeAndStringify(args[0]);
    if (args.length >= 2) {
      try {
        return `${value}\n${normalizeAndStringify(args[1])}`;
      } catch (err) {
        return Utils.formatErrorToStr(err);
      }
    }
    return value;
  }

  static formatErrorToStr(...args: unknown[]) {
    const error: string = args[0] instanceof Error ? args[0].message : 'Error';
    return Utils.formatWarningToStr(error, ...Array.from(args).slice(1));
  }
}

const borealisDark = getEuiThemeVars({ name: 'borealis', darkMode: true });
const borealisLight = getEuiThemeVars({ name: 'borealis', darkMode: false });

export const VegaThemeColors = {
  borealis: {
    dark: {
      grid: borealisDark.euiColorBorderBaseSubdued,
      title: borealisDark.euiColorTextSubdued,
      label: borealisDark.euiColorTextSubdued,
      default: borealisDark.euiColorVis0,
      visColors: [
        borealisDark.euiColorVis0,
        borealisDark.euiColorVis1,
        borealisDark.euiColorVis2,
        borealisDark.euiColorVis3,
        borealisDark.euiColorVis4,
        borealisDark.euiColorVis5,
        borealisDark.euiColorVis6,
        borealisDark.euiColorVis7,
        borealisDark.euiColorVis8,
        borealisDark.euiColorVis9,
      ],
    },
    light: {
      grid: borealisLight.euiColorBorderBaseSubdued,
      title: borealisLight.euiColorTextSubdued,
      label: borealisLight.euiColorTextSubdued,
      default: borealisLight.euiColorVis0,
      visColors: [
        borealisLight.euiColorVis0,
        borealisLight.euiColorVis1,
        borealisLight.euiColorVis2,
        borealisLight.euiColorVis3,
        borealisLight.euiColorVis4,
        borealisLight.euiColorVis5,
        borealisLight.euiColorVis6,
        borealisLight.euiColorVis7,
        borealisLight.euiColorVis8,
        borealisLight.euiColorVis9,
      ],
    },
  },
};

export function getVegaThemeColors<T extends 'grid' | 'title' | 'label' | 'default' | 'visColors'>(
  theme: CoreTheme,
  colorToken: T
) {
  const colorMode = theme.darkMode ? 'dark' : 'light';
  return VegaThemeColors[theme.name as keyof typeof VegaThemeColors]?.[colorMode][colorToken] as
    | (T extends 'visColors' ? Color[] : Color)
    | undefined;
}

/** Default area fill gradient aligned with Lens styling. */
export function getDefaultAreaGradientFill(defaultColor: string | string[]): Gradient {
  const color = Array.isArray(defaultColor) ? defaultColor[0] : defaultColor;
  return {
    gradient: 'linear',
    x1: 0,
    y1: 1,
    x2: 0,
    y2: 0,
    stops: [
      { offset: 0, color: transparentize(color, 0) },
      { offset: 0.2, color: transparentize(color, 0.1) },
      { offset: 0.8, color: transparentize(color, 0.9) },
      { offset: 1, color: transparentize(color, 1) },
    ],
  };
}
