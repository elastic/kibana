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
import { useEuiTheme } from '@elastic/eui';
import { getTabsShadowGradient } from './get_tabs_shadow_gradient';

export interface TabWithBackgroundProps extends HTMLAttributes<HTMLElement> {
  isSelected: boolean;
  children: React.ReactNode;
}

export const TabWithBackground: React.FC<TabWithBackgroundProps> = ({
  isSelected,
  children,
  ...otherProps
}) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const selectedTabBackgroundColor = document.querySelector(
    // TODO: listen to chromeStyle changes instead
    '.kbnBody--hasProjectActionMenu'
  )
    ? euiTheme.colors.body
    : euiTheme.colors.emptyShade;

  return (
    <div
      {...otherProps}
      // tab main background and another background color on hover
      css={css`
        display: inline-block;
        background-color: ${isSelected
          ? selectedTabBackgroundColor
          : euiTheme.colors.lightestShade};
        transition: background-color ${euiTheme.animation.fast};
        border-right: ${euiTheme.border.thin};
        border-color: ${euiTheme.colors.lightShade};

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
          background: ${isSelected ? 'transparent' : getTabsShadowGradient(euiThemeContext)};
          transition: background-color ${euiTheme.animation.fast};
        `}
      >
        {children}
      </div>
    </div>
  );
};
