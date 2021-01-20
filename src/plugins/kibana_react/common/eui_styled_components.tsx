/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import * as styledComponents from 'styled-components';
import { ThemedStyledComponentsModule, ThemeProvider, ThemeProviderProps } from 'styled-components';

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';

export interface EuiTheme {
  eui: typeof euiLightVars | typeof euiDarkVars;
  darkMode: boolean;
}

const EuiThemeProvider = <
  OuterTheme extends styledComponents.DefaultTheme = styledComponents.DefaultTheme
>({
  darkMode = false,
  ...otherProps
}: Omit<ThemeProviderProps<OuterTheme, OuterTheme & EuiTheme>, 'theme'> & {
  darkMode?: boolean;
}) => (
  <ThemeProvider
    {...otherProps}
    theme={(outerTheme?: OuterTheme) => ({
      ...outerTheme,
      eui: darkMode ? euiDarkVars : euiLightVars,
      darkMode,
    })}
  />
);

const {
  default: euiStyled,
  css,
  createGlobalStyle,
  keyframes,
  withTheme,
} = (styledComponents as unknown) as ThemedStyledComponentsModule<EuiTheme>;

export { css, euiStyled, EuiThemeProvider, createGlobalStyle, keyframes, withTheme };
