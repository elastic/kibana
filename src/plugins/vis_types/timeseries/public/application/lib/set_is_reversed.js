/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import color from 'color';
import { getCoreStart } from '../../services';

/**
 * Returns true if the color that is passed has low luminosity
 */
const isColorDark = (c) => {
  return color(c).luminosity() < 0.45;
};

/**
 * Checks to see if the `currentTheme` is dark in luminosity.
 * Defaults to checking `theme:darkMode`.
 */
export const isThemeDark = (currentTheme) => {
  let themeIsDark = currentTheme || getCoreStart().theme.getTheme().darkMode;

  // If passing a string, check the luminosity
  if (typeof currentTheme === 'string') {
    themeIsDark = isColorDark(currentTheme);
  }

  return themeIsDark;
};

/**
 * Checks to find if the ultimate `backgroundColor` is dark.
 * Defaults to returning if the `currentTheme` is dark.
 */
export const isBackgroundDark = (backgroundColor, currentTheme) => {
  const themeIsDark = isThemeDark(currentTheme);

  // If a background color doesn't exist or it inherits, pass back if it's a darktheme
  if (!backgroundColor || backgroundColor === 'inherit') {
    return themeIsDark;
  }

  // Otherwise return if the background color has low luminosity
  return isColorDark(backgroundColor);
};

/**
 * Checks to see if `backgroundColor` is the the same lightness spectrum as `currentTheme`.
 */
export const isBackgroundInverted = (backgroundColor, currentTheme) => {
  const backgroundIsDark = isBackgroundDark(backgroundColor, currentTheme);
  const themeIsDark = isThemeDark(currentTheme);
  return backgroundIsDark !== themeIsDark;
};
