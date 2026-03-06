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

/**
 * Fixed container height is required for virtuoso to work correctly.
 */
const CALENDAR_HEIGHT = 394;

export const calendarStyles = ({ euiTheme }: UseEuiTheme) => {
  const container = css`
    position: relative;
    height: ${CALENDAR_HEIGHT}px;
    flex-grow: 1;
  `;

  const todayButton = css`
    position: absolute;
    bottom: ${euiTheme.size.s};
    left: 50%;
    transform: translateX(-50%);
    background: ${euiTheme.colors.emptyShade};
    box-shadow: ${euiTheme.levels.menu};
    z-index: ${euiTheme.levels.mask};
  `;

  return { container, todayButton };
};
