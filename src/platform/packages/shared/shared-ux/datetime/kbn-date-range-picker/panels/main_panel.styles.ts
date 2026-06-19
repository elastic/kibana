/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { euiOverflowScroll } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';

export const mainPanelStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;
  const root = null;
  const presetsArea = css`
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-block-size: 0;
  `;
  const tabs = css`
    padding-block-start: ${euiTheme.size.s};
    margin-inline: ${euiTheme.size.s};
    flex-shrink: 0;
  `;
  const list = css`
    padding-block: ${euiTheme.size.s};
  `;
  const scroller = css`
    flex: 1 1 auto;
    min-block-size: 0;
    overflow-block: auto;
    ${euiOverflowScroll(euiThemeContext, { direction: 'y', mask: true })};
  `;
  const bottomSection = css`
    margin-block-start: auto;
    flex-shrink: 0;
  `;
  const documentationButtonWrapper = css`
    padding-inline: ${euiTheme.size.s};
    margin-block-start: calc(${euiTheme.size.s} * 2);
    flex-shrink: 0;
  `;

  return { root, presetsArea, tabs, list, scroller, bottomSection, documentationButtonWrapper };
};
