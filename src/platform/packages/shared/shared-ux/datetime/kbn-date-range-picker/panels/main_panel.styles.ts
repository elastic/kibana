/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

export const mainPanelStyles = ({ euiTheme }: UseEuiTheme) => {
  const root = null;
  const tabs = css`
    padding-block-start: ${euiTheme.size.s};
    margin-inline: ${euiTheme.size.s};
    position: sticky;
    top: 0px;
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;
  const list = css`
    padding-block: ${euiTheme.size.s};
  `;
  const stickyBottom = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
    position: sticky;
    bottom: 0px;
  `;

  return { root, tabs, list, stickyBottom };
};
