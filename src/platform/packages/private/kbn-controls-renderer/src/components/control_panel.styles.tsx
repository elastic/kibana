/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiBreakpoint, type UseEuiTheme } from '@elastic/eui';

export const controlWidthStyles = (euiThemeContext: UseEuiTheme) => ({
  '&.controlFrameWrapper--small': {
    width: `${euiThemeContext.euiTheme.base * 14}px`,
    minWidth: `${euiThemeContext.euiTheme.base * 14}px`,
  },
  '&.controlFrameWrapper--large': {
    width: `${euiThemeContext.euiTheme.base * 50}px`,
    minWidth: `${euiThemeContext.euiTheme.base * 50}px`,
  },
  '&.controlFrameWrapper--medium': {
    width: `${euiThemeContext.euiTheme.base * 25}px`,
    minWidth: `${euiThemeContext.euiTheme.base * 25}px`,
  },
  [euiBreakpoint(euiThemeContext, ['xs', 's', 'm'])]: {
    width: '100%',
    minWidth: 'unset',
  },
});
