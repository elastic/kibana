/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HTMLAttributes } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, euiSlightShadowHover } from '@elastic/eui';
import type { TabsServices } from '../../types';

export interface TabWithBackgroundProps extends HTMLAttributes<HTMLElement> {
  isSelected: boolean;
  isDragging?: boolean;
  services: TabsServices;
  children: React.ReactNode;
}

export const TabWithBackground = React.forwardRef<HTMLDivElement, TabWithBackgroundProps>(
  ({ isSelected, isDragging, services, children, ...otherProps }, ref) => {
    const euiThemeContext = useEuiTheme();
    const { euiTheme } = euiThemeContext;

    return (
      <div
        {...otherProps}
        ref={ref}
        // tab main background and another background color on hover
        css={css`
          display: inline-block;
          border-radius: ${euiTheme.border.radius.small};
          background: ${isSelected || isDragging
            ? euiTheme.colors.backgroundBasePlain
            : euiTheme.colors.lightestShade};
          transition: background ${euiTheme.animation.fast};
          margin-right: ${euiTheme.size.xs};

          ${isDragging
            ? `
              ${euiSlightShadowHover(euiThemeContext)};
              border-radius: ${euiTheme.border.radius.small};
          `
            : ''}

          ${isSelected
            ? ''
            : `
            &:hover {
              background-color: ${euiTheme.colors.lightShade};
            }
        `}
        `}
      >
        {children}
      </div>
    );
  }
);
