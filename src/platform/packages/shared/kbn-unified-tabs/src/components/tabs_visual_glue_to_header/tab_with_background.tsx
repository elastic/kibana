/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { HTMLAttributes } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, euiSlightShadowHover } from '@elastic/eui';
import { getTabsShadowGradient } from './get_tabs_shadow_gradient';
import { useChromeStyle } from './use_chrome_style';
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
    const { isProjectChromeStyle } = useChromeStyle(services);

    const selectedTabBackgroundColor = isProjectChromeStyle
      ? euiTheme.colors.body
      : euiTheme.colors.emptyShade;

    return (
      <div
        {...otherProps}
        ref={ref}
        // tab main background and another background color on hover
        css={css`
          display: inline-block;
          background: ${isSelected ? selectedTabBackgroundColor : euiTheme.colors.lightestShade};
          transition: background ${euiTheme.animation.fast};
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
        <div
          // a top shadow for an unselected tab to make sure that it stays visible when the tab is hovered
          css={css`
            background: ${isSelected || isDragging
              ? 'transparent'
              : getTabsShadowGradient(euiThemeContext)};
            transition: background ${euiTheme.animation.fast};
          `}
        >
          {children}
        </div>
      </div>
    );
  }
);
