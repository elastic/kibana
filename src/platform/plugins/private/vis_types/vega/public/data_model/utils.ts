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
import { getEuiThemeVars } from '@kbn/ui-theme';
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

// These colors should be replaced with the respective tokens whenever available from EUI
export const VegaThemeColors = {
  borealis: {
    dark: {
      grid: '#2B394F', // euiColorBorderBaseSubdued euiColorShade120
      title: '#CAD3E2', // euiColorTextParagraph euiColorShade30
      label: '#8E9FBC', // euiColorTextSubdued euiColorShade60
      default: borealisDark.euiColorVis0, // visColors.euiColorVis0 accentSecondary60,
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
      grid: '#E3E8F2', // euiColorBorderBaseSubdued euiColorShade20
      title: '#1D2A3E', // textParagraph euiColorShade130
      label: '#516381', // euiColorTextSubdued euiColorShade95
      default: borealisLight.euiColorVis0, // visColors.euiColorVis0 accentSecondary60
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

export function getVegaThemeColors(
  theme: CoreTheme,
  colorToken: 'grid' | 'title' | 'label' | 'default' | 'visColors'
) {
  const colorMode = theme.darkMode ? 'dark' : 'light';
  return VegaThemeColors[theme.name as keyof typeof VegaThemeColors]?.[colorMode][colorToken];
}
