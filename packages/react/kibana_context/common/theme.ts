/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type EuiThemeSystem } from '@elastic/eui';
import { EuiThemeAmsterdam } from '@elastic/eui';
import { EuiThemeBarcelona } from '@elastic/eui-theme-barcelona';
import { EuiThemeRainbow } from '@elastic/eui-theme-rainbow';
import { ThemeNameValue } from '@kbn/core-ui-settings-common';

export interface ThemeDescriptor {
  euiTheme: EuiThemeSystem;
}

export const KIBANA_THEMES: Record<ThemeNameValue, ThemeDescriptor> = {
  amsterdam: {
    euiTheme: EuiThemeAmsterdam,
  },
  barcelona: {
    euiTheme: EuiThemeBarcelona,
  },
  rainbow: {
    euiTheme: EuiThemeRainbow,
  }
};

export const DEFAULT_KIBANA_THEME_NAME: ThemeNameValue = 'amsterdam';

export const getKibanaDefaultTheme = () => KIBANA_THEMES[DEFAULT_KIBANA_THEME_NAME];

export const getKibanaThemeByName = (name: ThemeNameValue) => KIBANA_THEMES[name];
