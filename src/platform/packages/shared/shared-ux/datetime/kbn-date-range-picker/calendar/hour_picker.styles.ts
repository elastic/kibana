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

/** The scrolling container fixed height. Cannot be easily calculated. */
const PANEL_BODY_HEIGHT = 394;

export const hourPickerStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;

  const container = css`
    align-items: center;
    display: flex;
    flex-direction: column;
    height: ${PANEL_BODY_HEIGHT}px;
    padding: ${euiTheme.size.s} ${euiTheme.size.base};
    width: calc(${euiTheme.size.xxxl} + ${euiTheme.size.base}; * 2);
    overflow-y: auto;
    ${euiScrollBarStyles(euiThemeContext)}
  `;

  return { container };
};
