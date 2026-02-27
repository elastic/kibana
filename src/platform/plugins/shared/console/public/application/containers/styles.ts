/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const consoleEditorPanelStyles = css`
  display: flex;
  flex: 1 1 auto;
  position: absolute;
  left: 0;
  bottom: 0;
  right: 0;
  overflow: hidden;
`;

export const useResizerButtonStyles = () => {
  const { euiTheme } = useEuiTheme();

  return css`
    // Give the aria selection border priority when the divider is selected on IE11 and Chrome
    z-index: ${euiTheme.levels.header};
    background-color: ${euiTheme.colors.lightestShade};
    // The margin ensures that the resizer doesn't cover the top border of the selected request
    // in the output panel, when in vertical layout
    margin-bottom: 1px;
    // The margin ensures that the resizer doesn't cover the first Monaco editor's ruler
    margin-inline: 0;
  `;
};
