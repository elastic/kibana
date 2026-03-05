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

export const calendarStyles = ({ euiTheme }: UseEuiTheme) => {
  const container = css`
    position: relative;
    height: 394px;
    flex-grow: 1;
    border-right: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
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
