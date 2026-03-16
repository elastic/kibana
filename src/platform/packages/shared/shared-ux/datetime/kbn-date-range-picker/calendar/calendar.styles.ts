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
import { CALENDAR_MONTH_ESTIMATED_HEIGHT } from './calendar.constants';

/**
 * Fixed panel height for the calendar scroll area.
 * The value is something that doesn't produce a second scrollbar in the `PanelBody`.
 */
const CALENDAR_HEIGHT = 394;

export const calendarStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;

  const container = css`
    position: relative;
    height: ${CALENDAR_HEIGHT}px;
    flex-grow: 1;
  `;

  const scroller = css`
    height: 100%;
    overflow-y: auto;
    padding-left: ${euiTheme.size.base};
    padding-right: ${euiTheme.size.base};
    ${euiScrollBarStyles(euiThemeContext)}
  `;

  const monthItem = css`
    content-visibility: auto;
    contain-intrinsic-size: auto ${CALENDAR_MONTH_ESTIMATED_HEIGHT}px;
  `;

  const todayButton = css`
    background: ${euiTheme.colors.backgroundBasePlain};
    bottom: ${euiTheme.size.s};
    box-shadow: ${euiTheme.shadows.m.down};
    left: 50%;
    position: absolute;
    transform: translateX(-50%);
    z-index: ${euiTheme.levels.mask};

    &:hover {
      box-shadow: ${euiTheme.shadows.l.down};
    }

    &&:hover::before,
    &&:active::before {
      background-color: ${euiTheme.colors.backgroundBasePlain};
    }
  `;

  return { container, scroller, monthItem, todayButton };
};
