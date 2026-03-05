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

/** Total panel body height in pixels — must match the Calendar component's height. */
const PANEL_BODY_HEIGHT = 394;

export const calendarPanelStyles = ({ euiTheme }: UseEuiTheme) => {
  const timeColumn = css`
    display: flex;
    flex-direction: column;
    height: ${PANEL_BODY_HEIGHT}px;
  `;

  const timeSection = css`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;

    & + & {
      border-top: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
    }
  `;

  const timeSectionHeader = css`
    flex-shrink: 0;
    margin: 0;
    padding: ${euiTheme.size.xs} ${euiTheme.size.base};
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.subduedText};
    border-bottom: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
  `;

  return { timeColumn, timeSection, timeSectionHeader };
};
