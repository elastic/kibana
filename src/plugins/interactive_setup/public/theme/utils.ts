/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiThemeColorMode } from '@elastic/eui/src/services/theme/types';

import type { CoreTheme } from '../../../../core/public';

/**
 * Copied from the `kibana_react` plugin, remove once https://github.com/elastic/kibana/issues/119204 is implemented.
 */
export const getColorMode = (theme: CoreTheme): EuiThemeColorMode => {
  // COLOR_MODES_STANDARD is not exported from eui
  return theme.darkMode ? 'DARK' : 'LIGHT';
};
