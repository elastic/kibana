/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import color from 'color';
import chrome from '../../../../ui/public/chrome';
const IS_DARK_THEME = chrome.getUiSettingsClient().get('theme:darkMode');

/**
 * Checks to see if the current theme is dark in luminosity
 */
export const isThemeDark = (currentTheme) => {
  let themeIsDark = currentTheme || IS_DARK_THEME;

  // If passing a string, check the luminosity
  if (typeof currentTheme === 'string') {
    themeIsDark = color(currentTheme).luminosity() < 0.45;
  }

  return themeIsDark;
};

/**
 * Checks to find if the ultimate background color is dark
 */
export const isItDark = (backgroundColor, currentTheme) => {
  const themeIsDark = isThemeDark(currentTheme);

  // If a background color doesn't exist or it inherits, pass back if it's a darktheme
  if (backgroundColor === undefined || backgroundColor === 'inherit') {
    return themeIsDark;
  }

  // Otherwise return if the background color has low luminosity
  return color(backgroundColor).luminosity() < 0.45;
};

/**
 * Checks to see if the first parameter (backgroundColor) is the the same
 * lightness spectrum as the second parameter (currentTheme).
 */
export const isItReverse = (backgroundColor, currentTheme) => {
  const backgroundIsDark = isItDark(backgroundColor, currentTheme);
  const themeIsDark = isThemeDark(currentTheme);

  if ((backgroundIsDark && !themeIsDark) || (!backgroundIsDark && themeIsDark)) {
    return true;
  } else {
    return false;
  }
};


