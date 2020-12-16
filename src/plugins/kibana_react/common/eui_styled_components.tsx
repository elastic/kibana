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
