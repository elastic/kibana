/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiThemeSystem, EuiThemeAmsterdam } from '@elastic/eui';
import { EuiThemeBorealis } from '@elastic/eui-theme-borealis';

export interface ThemeConfig {
  euiTheme: EuiThemeSystem;
}

const THEMES: Record<string, ThemeConfig> = {
  amsterdam: {
    euiTheme: EuiThemeAmsterdam,
  },
  borealis: {
    euiTheme: EuiThemeBorealis,
  },
};

export const getThemeConfigByName = (name: string): ThemeConfig | null => {
  return THEMES[name as keyof typeof THEMES] || null;
};

export const DEFAULT_THEME_CONFIG = THEMES.amsterdam;
