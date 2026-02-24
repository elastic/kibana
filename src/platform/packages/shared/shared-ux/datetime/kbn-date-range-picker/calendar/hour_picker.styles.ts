/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { euiScrollBarStyles, type UseEuiTheme } from '@elastic/eui';

export const hourPickerStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;

  // TODO: replace pixels
  const container = css`
    display: flex;
    flex-direction: column;
    padding: ${euiTheme.size.s};
    width: 80px;
    align-items: center;
    height: 394px;
    ${euiScrollBarStyles(euiThemeContext)}
    overflow-y: auto;
  `;

  return { container };
};
