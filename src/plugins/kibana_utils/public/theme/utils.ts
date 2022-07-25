/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { COLOR_MODES_STANDARD } from '@elastic/eui';
import type { EuiThemeColorModeStandard } from '@elastic/eui';

import type { CoreTheme } from '@kbn/core/public';

/**
 * Copied from the `kibana_react` plugin, to avoid cyclical dependency
 */
export const getColorMode = (theme: CoreTheme): EuiThemeColorModeStandard => {
  return theme.darkMode ? COLOR_MODES_STANDARD.dark : COLOR_MODES_STANDARD.light;
};
