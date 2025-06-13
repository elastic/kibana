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
import { getEuiThemeVars } from '@kbn/ui-theme';

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

const amsterdamDark = getEuiThemeVars({ darkMode: true });
const amsterdamLight = getEuiThemeVars({ darkMode: false });

// These colors should be replaced with the respective tokens whenever available from EUI
export const VegaThemeColors = {
  amsterdam: {
    dark: {
      grid: '#343741', // euiColorChartLines euiColorLightShade
      title: '#D4DAE5', // euiColorDarkestShade
      label: '#98A2B3', // euiColorDarkShade
      default: amsterdamDark.euiColorVis0, // visColors.euiColorVis0
      visColors: [
        amsterdamDark.euiColorVis0,
        amsterdamDark.euiColorVis1,
        amsterdamDark.euiColorVis2,
        amsterdamDark.euiColorVis3,
        amsterdamDark.euiColorVis4,
        amsterdamDark.euiColorVis5,
        amsterdamDark.euiColorVis6,
        amsterdamDark.euiColorVis7,
        amsterdamDark.euiColorVis8,
        amsterdamDark.euiColorVis9,
      ],
    },
    light: {
      grid: '#eef0f3', // euiColorChartLines shade($euiColorLightestShade, 3%)
      title: '#343741', // euiColorDarkestShade
      label: '#69707D', // euiColorDarkShade
      default: amsterdamLight.euiColorVis0, // visColors.euiColorVis0
      visColors: [
        amsterdamLight.euiColorVis0,
        amsterdamLight.euiColorVis1,
        amsterdamLight.euiColorVis2,
        amsterdamLight.euiColorVis3,
        amsterdamLight.euiColorVis4,
        amsterdamLight.euiColorVis5,
        amsterdamLight.euiColorVis6,
        amsterdamLight.euiColorVis7,
        amsterdamLight.euiColorVis8,
        amsterdamLight.euiColorVis9,
      ],
    },
  },
};

export function getVegaThemeColors(
  theme: CoreTheme,
  colorToken: 'grid' | 'title' | 'label' | 'default' | 'visColors'
) {
  const colorMode = theme.darkMode ? 'dark' : 'light';
  const themeName = 'amsterdam';
  return VegaThemeColors[themeName][colorMode][colorToken];
}
