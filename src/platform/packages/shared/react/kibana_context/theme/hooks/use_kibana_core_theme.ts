/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme, COLOR_MODES_STANDARD } from '@elastic/eui';
import type { CoreTheme } from '@kbn/core-theme-browser';

const euiThemeMap: Record<string, string> = {
  EUI_THEME_BOREALIS: 'borealis',
  EUI_THEME_AMSTERDAM: 'amsterdam',
};

export const useKibanaCoreTheme = (): CoreTheme => {
  const { euiTheme, colorMode } = useEuiTheme();
  return {
    name: euiThemeMap[euiTheme.themeName] ?? 'borealis',
    darkMode: colorMode === COLOR_MODES_STANDARD.dark,
  };
};
