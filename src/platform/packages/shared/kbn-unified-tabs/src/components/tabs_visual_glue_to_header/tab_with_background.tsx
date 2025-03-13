/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { getTabsShadowGradient } from './get_tabs_shadow_gradient';

export interface TabWithBackgroundProps {
  isSelected: boolean;
  children: React.ReactNode;
}

export const TabWithBackground: React.FC<TabWithBackgroundProps> = ({ isSelected, children }) => {
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
      css={css`
        background-color: ${isSelected
          ? selectedTabBackgroundColor
          : euiTheme.colors.lightestShade};
        transition: background-color ${euiTheme.animation.fast};

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
        css={css`
          background: ${isSelected ? 'transparent' : getTabsShadowGradient(euiThemeContext)};
          transition: background-color ${euiTheme.animation.fast};
        `}
      >
        <div
          css={css`
            border-right: ${euiTheme.border.thin};
            border-color: ${euiTheme.colors.lightShade};
          `}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
