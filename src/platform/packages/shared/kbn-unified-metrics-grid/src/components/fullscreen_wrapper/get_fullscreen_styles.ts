/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import type { CSSObject } from '@emotion/react';

export const getFullScreenStyles = (euiTheme: EuiThemeComputed): CSSObject => {
  return {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: euiTheme.colors.backgroundBasePlain,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    zIndex: euiTheme.levels.modal,
    overscrollBehavior: 'contain',
  };
};
