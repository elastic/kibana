/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// https://github.com/pugson/hexp3/blob/main/utils/color.ts
/**
 * converts HEX, RGB, RGBA colors to display-p3 color space
 */
export const getDisplayP3Color = (color: string): string => {
  // regex for matching HEX, RGB, RGBA colors
  const hexColorRegExp = /^#([0-9a-fA-F]{8}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;
  const rgbColorRegExp = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/;
  const rgbaColorRegExp = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([01]?(\.\d+)?)\)$/;

  let red = 0;
  let green = 0;
  let blue = 0;
  let alpha = 1;

  if (hexColorRegExp.test(color)) {
    // parse HEX with optional alpha
    const match = color.match(hexColorRegExp);
    if (match) {
      const hex = match[1];
      if (hex.length === 6 || hex.length === 8) {
        // HEX with or without alpha
        const step = hex.length === 8 ? 2 : hex.length / 3;
        red = parseInt(hex.slice(0, step), 16);
        green = parseInt(hex.slice(step, 2 * step), 16);
        blue = parseInt(hex.slice(2 * step, 3 * step), 16);
        alpha = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      } else if (hex.length === 3 || hex.length === 4) {
        // 3 or 4 digit HEX
        red = parseInt(hex[0] + hex[0], 16);
        green = parseInt(hex[1] + hex[1], 16);
        blue = parseInt(hex[2] + hex[2], 16);
        alpha = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
      }
    }
  } else if (rgbColorRegExp.test(color)) {
    // parse RGB
    const match = color.match(rgbColorRegExp);
    if (match) {
      red = parseInt(match[1], 10);
      green = parseInt(match[2], 10);
      blue = parseInt(match[3], 10);
    }
  } else if (rgbaColorRegExp.test(color)) {
    // parse RGBA
    const match = color.match(rgbaColorRegExp);
    if (match) {
      red = parseInt(match[1], 10);
      green = parseInt(match[2], 10);
      blue = parseInt(match[3], 10);
      alpha = parseFloat(match[4]);
    }
  } else {
    // return transparent without converting if something doesn't match
    return 'rgba(0, 0, 0, 0)';
  }

  // convert to P3 color space
  const r = (red / 255).toFixed(6);
  const g = (green / 255).toFixed(6);
  const b = (blue / 255).toFixed(6);
  const a = alpha.toFixed(6);

  return `color(display-p3 ${r} ${g} ${b} / ${a})`;
};
