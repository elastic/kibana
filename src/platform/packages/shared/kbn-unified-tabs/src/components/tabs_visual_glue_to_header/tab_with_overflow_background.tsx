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
import { zLevels } from './constants';

export interface TabWithOverflowBackgroundProps {
  isSelected: boolean;
  children: React.ReactNode;
}

export const TabWithOverflowBackground: React.FC<TabWithOverflowBackgroundProps> = ({
  isSelected,
  children,
}) => {
  const { euiTheme } = useEuiTheme();
  const selectedTabBackgroundColor = document.querySelector(
    // TODO: listen to chromeStyle changes instead
    '.kbnBody--hasProjectActionMenu'
  )
    ? euiTheme.colors.body
    : euiTheme.colors.emptyShade;

  return (
    <div
      css={css`
        position: relative;
      `}
    >
      <div
        css={css`
          display: block;
          position: absolute;
          top: ${isSelected ? `-${euiTheme.size.xs}` : 0};
          bottom: 0;
          right: 0;
          left: 0;
          background-color: ${isSelected
            ? selectedTabBackgroundColor
            : euiTheme.colors.lightestShade};
          transition: background-color ${euiTheme.animation.fast};
          z-index: ${isSelected
            ? zLevels.aboveHeaderShadowTabBackground
            : zLevels.belowHeaderShadowTabBackground};
          border-right: ${euiTheme.border.thin};
          border-color: ${euiTheme.colors.lightShade};
        `}
      />
      <div
        css={css`
          position: relative;
          z-index: ${zLevels.tabMainContent};
        `}
      >
        {children}
      </div>
    </div>
  );
};
