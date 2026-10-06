/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css, keyframes } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';

export const TANSTACK_CELL_ACTIONS_CLASS = 'tsg-cellActions';

const cellActionPopIn = keyframes({
  from: { opacity: 0, transform: 'scale(0.35)' },
  to: { opacity: 1, transform: 'scale(1)' },
});

export const tanStackCellActionsStyles = {
  cellWithActions: (_themeContext: UseEuiTheme) =>
    css({
      position: 'relative',
      overflow: 'hidden',
      [`&:hover .${TANSTACK_CELL_ACTIONS_CLASS}, &:focus-within .${TANSTACK_CELL_ACTIONS_CLASS}`]: {
        display: 'flex',
      },
      [`&.tsg-actionsDismissed .${TANSTACK_CELL_ACTIONS_CLASS}, &.tsg-actionsDismissed:hover .${TANSTACK_CELL_ACTIONS_CLASS}, &.tsg-actionsDismissed:focus-within .${TANSTACK_CELL_ACTIONS_CLASS}`]:
        {
          display: 'none',
          pointerEvents: 'none',
        },
    }),

  cellActions: (themeContext: UseEuiTheme) => {
    const { euiTheme } = themeContext;
    return css({
      position: 'absolute',
      top: euiTheme.size.xxs,
      right: euiTheme.size.xxs,
      zIndex: 1,
      display: 'none',
      alignItems: 'center',
      boxSizing: 'border-box',
      transformOrigin: 'right center',
    });
  },

  cellActionsStayVisible: css({
    display: 'flex',
  }),

  cellActionsFixed: (themeContext: UseEuiTheme) => {
    const { euiTheme } = themeContext;
    return css({
      position: 'fixed',
      zIndex: euiTheme.levels.menu,
    });
  },

  cellActionsOpen: (themeContext: UseEuiTheme) => {
    const { euiTheme } = themeContext;
    return css({
      display: 'flex',
      gap: euiTheme.size.xxs,
      paddingInline: euiTheme.size.xxs,
      overflow: 'hidden',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
      borderRadius: euiTheme.size.m,
      color: euiTheme.colors.text,
    });
  },

  cellActionPop: css({
    display: 'inline-flex',
    transformOrigin: 'center',
    animation: `${cellActionPopIn} 280ms cubic-bezier(0.2, 0.85, 0.3, 1.25) both`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
    },
  }),

  cellActionButton: css({
    flexShrink: 0,
  }),

  cellActionsToolbar: (themeContext: UseEuiTheme) => {
    const { euiTheme } = themeContext;
    return css({
      display: 'flex',
      alignItems: 'center',
      gap: euiTheme.size.xxs,
    });
  },
};
