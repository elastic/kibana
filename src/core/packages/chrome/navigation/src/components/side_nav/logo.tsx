/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIcon, EuiText, useEuiFocusRing, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
export interface SideNavLogoProps {
  href: string;
  isCollapsed: boolean;
  label: string;
  logoType: string;
}

/**
 * It's used to communicate what solution the user is currently in.
 */
export const SideNavLogo = ({
  href,
  isCollapsed,
  label,
  logoType,
}: SideNavLogoProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();

  return (
    <a
      // TODO: translate
      aria-label={`${label} homepage`}
      href={href}
      css={css`
        ${useEuiFocusRing()}
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
            font-weight: ${euiTheme.font.weight.medium};
            font-size: 11px;
            color: ${euiTheme.colors.textParagraph};
          `}
          size="xs"
        >
          {label}
        </EuiText>
      )}
    </a>
  );
};
