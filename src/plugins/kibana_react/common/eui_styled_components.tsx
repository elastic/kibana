/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DecoratorFn } from '@storybook/react';
import React from 'react';
import * as styledComponents from 'styled-components';
import { ThemedStyledComponentsModule, ThemeProvider, ThemeProviderProps } from 'styled-components';
import { euiThemeVars, euiLightVars, euiDarkVars } from '@kbn/ui-theme';

export interface EuiTheme {
  eui: typeof euiThemeVars;
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

/**
 * Storybook decorator using the EUI theme provider. Uses the value from
 * `globals` provided by the Storybook theme switcher.
 */
export const EuiThemeProviderDecorator: DecoratorFn = (storyFn, { globals }) => {
  const darkMode = globals.euiTheme === 'v8.dark' || globals.euiTheme === 'v7.dark';

  return <EuiThemeProvider darkMode={darkMode}>{storyFn()}</EuiThemeProvider>;
};

const {
  default: euiStyled,
  css,
  createGlobalStyle,
  keyframes,
  withTheme,
} = styledComponents as unknown as ThemedStyledComponentsModule<EuiTheme>;

export { css, euiStyled, EuiThemeProvider, createGlobalStyle, keyframes, withTheme };
