/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DecoratorFn } from '@storybook/react';
import React from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import * as styledComponents from 'styled-components';
// eslint-disable-next-line @kbn/eslint/module_migration
import { ThemedStyledComponentsModule, ThemeProvider, ThemeProviderProps } from 'styled-components';
import { euiThemeVars, euiLightVars, euiDarkVars } from '@kbn/ui-theme';

/**
 * A `deprecated` structure representing a Kibana theme containing variables from the current EUI theme.
 */
export interface EuiTheme {
  /** EUI theme vars that automaticall adjust to light and dark mode. */
  eui: typeof euiThemeVars;
  /** True if the theme is in "dark" mode, false otherwise. */
  darkMode: boolean;
}

/**
 * A `styled-components` `ThemeProvider` that incorporates EUI dark mode.
 */
const KibanaStyledComponentsThemeProvider = <
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
 *
 * @deprecated All Kibana components need to migrate to Emotion.
 */
export const KibanaStyledComponentsThemeProviderDecorator: DecoratorFn = (storyFn, { globals }) => {
  const darkMode = globals.euiTheme === 'v8.dark' || globals.euiTheme === 'v7.dark';

  return (
    <KibanaStyledComponentsThemeProvider darkMode={darkMode}>
      {storyFn()}
    </KibanaStyledComponentsThemeProvider>
  );
};

const {
  /** see https://styled-components.com/docs/api#styled */
  default: euiStyled,
  /** see https://styled-components.com/docs/api#css-prop */
  css,
  /** see https://styled-components.com/docs/api#createglobalstyle */
  createGlobalStyle,
  /** see https://styled-components.com/docs/api#keyframes */
  keyframes,
  /** see https://styled-components.com/docs/api#withtheme */
  withTheme,
} = styledComponents as unknown as ThemedStyledComponentsModule<EuiTheme>;

export {
  css,
  euiStyled,
  KibanaStyledComponentsThemeProvider,
  createGlobalStyle,
  keyframes,
  withTheme,
};
