/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { type EuiThemeComputed } from '@elastic/eui';

export const codeBoxPanel = (euiTheme: EuiThemeComputed<{}>) =>
  css({
    borderTop: `${euiTheme.border.thin} ${euiTheme.colors.lightestShade}`,
  });

export const codeBoxCodeBlock = css({
  wordBreak: 'break-all',
});

export const searchSelectClientPanelSelectedBorder = (euiTheme: EuiThemeComputed<{}>) =>
  css({
    '&::before': {
      border: `1px solid ${euiTheme.colors.primary}`,
      content: `''`,
      display: 'block',
    },
  });

export const searchSelectClientPanelBorder = (euiTheme: EuiThemeComputed<{}>) =>
  css({
    '&::before': {
      border: `1px solid ${euiTheme.colors.lightestShade}`,
      content: `''`,
      display: 'block',
    },
  });
