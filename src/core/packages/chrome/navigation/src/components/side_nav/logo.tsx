/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
export interface SideNavLogoProps {
  isCollapsed: boolean;
  label: string;
  logoType: string;
}

/**
 * It's not clickable or focusable.
 * It's used to communicate what solution the user is currently in.
 */
export const SideNavLogo = ({ isCollapsed, label, logoType }: SideNavLogoProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        align-items: center;
        border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
        display: flex;
        flex-direction: column;
        // 3px is from Figma; there is no token
        gap: 3px;
        justify-content: center;
        padding: ${euiTheme.size.s} ${euiTheme.size.s}
          ${isCollapsed ? euiTheme.size.s : euiTheme.size.m};
      `}
    >
      <div
        css={css`
          align-items: center;
          display: flex;
          height: ${euiTheme.size.xl};
          justify-content: center;
          width: ${euiTheme.size.xl};
        `}
      >
        {/**
         * In Figma, the icon is 20x20
         * `EuiIcon` supports `l` which is 24x24
         * and `m` which is 16x16;
         * Hence style override
         */}
        <EuiIcon
          css={css`
            height: 20px;
            width: 20px;
          `}
          type={logoType}
        />
      </div>
      {!isCollapsed && (
        <EuiText
          css={css`
            font-weight: ${euiTheme.font.weight.semiBold};
            font-size: ${
              label.length > 10
                ? '0.75rem' /* ~10.5px - fine print for longer labels */
                : '0.8571rem' /* ~12px - input label size for shorter labels */
            };
            line-height: ${label.length > 10 ? '1rem' : '1.1429rem'};
          `}
          size="xs"
        >
          {label}
        </EuiText>
      )}
    </div>
  );
};
