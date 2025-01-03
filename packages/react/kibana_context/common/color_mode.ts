/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { COLOR_MODES_STANDARD } from '@elastic/eui';
import type { EuiThemeColorModeStandard } from '@elastic/eui';
import type { KibanaTheme } from './types';

/**
 * Given a `KibanaTheme`, provide a color mode for use with EUI.
 * @param theme KibanaTheme
 * @returns EuiThemeColorModeStandard
 */
export const getColorMode = (theme: KibanaTheme): EuiThemeColorModeStandard => {
  return theme.darkMode ? COLOR_MODES_STANDARD.dark : COLOR_MODES_STANDARD.light;
};
