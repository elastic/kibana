/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// @ts-ignore
import colorJS from 'color';
import { Theme, LEGACY_LIGHT_THEME, LEGACY_DARK_THEME } from '@elastic/charts';

function computeRelativeLuminosity(rgb: string) {
  return colorJS(rgb).luminosity();
}

function computeContrast(rgb1: string, rgb2: string) {
  return colorJS(rgb1).contrast(colorJS(rgb2));
}

function getAAARelativeLum(bgColor: string, fgColor: string, ratio = 7) {
  const relLum1 = computeRelativeLuminosity(bgColor);
  const relLum2 = computeRelativeLuminosity(fgColor);
  if (relLum1 > relLum2) {
    // relLum1 is brighter, relLum2 is darker
    return (relLum1 + 0.05 - ratio * 0.05) / ratio;
  } else {
    // relLum1 is darker, relLum2 is brighter
    return Math.min(ratio * (relLum1 + 0.05) - 0.05, 1);
  }
}

function getGrayFromRelLum(relLum: number) {
  if (relLum <= 0.0031308) {
    return relLum * 12.92;
  } else {
    return (1.0 + 0.055) * Math.pow(relLum, 1.0 / 2.4) - 0.055;
  }
}

function getGrayRGBfromGray(gray: number) {
  const g = Math.round(gray * 255);
  return `rgb(${g},${g},${g})`;
}

function getAAAGray(bgColor: string, fgColor: string, ratio = 7) {
  const relLum = getAAARelativeLum(bgColor, fgColor, ratio);
  const gray = getGrayFromRelLum(relLum);
  return getGrayRGBfromGray(gray);
}

function findBestContrastColor(
  bgColor: string,
  lightFgColor: string,
  darkFgColor: string,
  ratio = 4.5
) {
  const lc = computeContrast(bgColor, lightFgColor);
  const dc = computeContrast(bgColor, darkFgColor);
  if (lc >= dc) {
    if (lc >= ratio) {
      return lightFgColor;
    }
    return getAAAGray(bgColor, lightFgColor, ratio);
  }
  if (dc >= ratio) {
    return darkFgColor;
  }
  return getAAAGray(bgColor, darkFgColor, ratio);
}

function isValidColor(color: string | null | undefined): color is string {
  if (typeof color !== 'string') {
    return false;
  }
  if (color.length === 0) {
    return false;
  }
  try {
    colorJS(color);
    return true;
  } catch {
    return false;
  }
}

/**
 * compute base chart theme based on the background color
 *
 * @param baseTheme
 * @param bgColor
 */
export function getBaseTheme(baseTheme: Theme, bgColor?: string | null): Theme {
  if (!isValidColor(bgColor)) {
    return baseTheme;
  }

  const bgLuminosity = computeRelativeLuminosity(bgColor);
  const mainTheme = bgLuminosity <= 0.179 ? LEGACY_DARK_THEME : LEGACY_LIGHT_THEME;
  const color = findBestContrastColor(
    bgColor,
    LEGACY_LIGHT_THEME.axes.axisTitle.fill,
    LEGACY_DARK_THEME.axes.axisTitle.fill
  );
  return {
    ...mainTheme,
    axes: {
      ...mainTheme.axes,
      axisTitle: {
        ...mainTheme.axes.axisTitle,
        fill: color,
      },
      tickLabel: {
        ...mainTheme.axes.tickLabel,
        fill: color,
      },
      axisLine: {
        ...mainTheme.axes.axisLine,
        stroke: color,
      },
      tickLine: {
        ...mainTheme.axes.tickLine,
        stroke: color,
      },
    },
  };
}

export function getChartClasses(bgColor?: string) {
  // keep the original theme color if no bg color is specified
  if (typeof bgColor !== 'string') {
    return;
  }
  const bgLuminosity = computeRelativeLuminosity(bgColor);
  return bgLuminosity <= 0.179 ? 'tvbVisTimeSeriesDark' : 'tvbVisTimeSeriesLight';
}
