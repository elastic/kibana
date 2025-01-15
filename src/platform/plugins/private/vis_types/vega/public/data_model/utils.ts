/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import compactStringify from 'json-stringify-pretty-compact';
import { CoreTheme } from '@kbn/core/public';

export class Utils {
  /**
   * If the 2nd array parameter in args exists, append it to the warning/error string value
   */
  static formatWarningToStr(...args: any[]) {
    let value = args[0];
    if (args.length >= 2) {
      try {
        if (typeof args[1] === 'string') {
          value += `\n${args[1]}`;
        } else {
          value += '\n' + compactStringify(args[1], { maxLength: 70 });
        }
      } catch (err) {
        // ignore
      }
    }
    return value;
  }

  static formatErrorToStr(...args: any[]) {
    let error: Error | string = args[0];
    if (!error) {
      error = 'ERR';
    } else if (error instanceof Error) {
      error = error.message;
    }
    return Utils.formatWarningToStr(error, ...Array.from(args).slice(1));
  }
}

// These colors should be replaced with the respective tokens whenever available from EUI
const VegaThemeColors = {
  borealis: {
    dark: {
      grid: '#2B394F', // euiColorBorderBaseSubdued euiColorShade120
      title: '#CAD3E2', // euiColorTextParagraph euiColorShade30
      label: '#8E9FBC', // euiColorTextSubdued euiColorShade60
    },
    light: {
      grid: '#E3E8F2', // euiColorBorderBaseSubdued euiColorShade20
      title: '#1D2A3E', // textParagraph euiColorShade130
      label: '#516381', // euiColorTextSubdued euiColorShade95
    },
  },
  amsterdam: {
    dark: {
      grid: '#343741', // euiColorChartLines euiColorLightShade
      title: '#D4DAE5', // euiColorDarkestShade
      label: '#98A2B3', // euiColorDarkShade
    },
    light: {
      grid: '#eef0f3', // euiColorChartLines shade($euiColorLightestShade, 3%)
      title: '#343741', // euiColorDarkestShade
      label: '#69707D', // euiColorDarkShade
    },
  },
};

export function getVegaThemeColors(theme: CoreTheme, colorToken: 'grid' | 'title' | 'label') {
  const colorMode = theme.darkMode ? 'dark' : 'light';
  const themeName = theme.name === 'borealis' ? 'borealis' : 'amsterdam';
  return VegaThemeColors[themeName][colorMode][colorToken];
}
