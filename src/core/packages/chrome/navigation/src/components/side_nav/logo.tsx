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

import { MenuItem } from '../menu_item';

export interface SideNavLogoProps {
  href: string;
  isActive: boolean;
  isCollapsed: boolean;
  label: string;
  logoType: string;
}

/**
 * It's used to communicate what solution the user is currently in.
 */
export const SideNavLogo = ({
  href,
  isActive,
  isCollapsed,
  label,
  logoType,
}: SideNavLogoProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();

  /**
   * In Figma, the logo icon is 20x20.
   * `EuiIcon` supports `l` which is 24x24 and `m` which is 16x16.
   */
  const wrapperStyles = css`
    border-bottom: 1px solid ${euiTheme.colors.borderBaseSubdued};
    padding-top: ${isCollapsed ? euiTheme.size.s : euiTheme.size.m};
    padding-bottom: ${isCollapsed ? euiTheme.size.s : euiTheme.size.m};

    .euiText {
      font-weight: ${euiTheme.font.weight.bold};
    }

    svg {
      height: 20px;
      width: 20px;
    }
  `;

  return (
    <div css={wrapperStyles}>
      <MenuItem
        aria-label={`${label} homepage`}
        data-test-subj="sideNavLogo"
        href={href}
        iconType={logoType}
        isActive={isActive}
        isLabelVisible={!isCollapsed}
        isTruncated={false}
      >
        {label}
      </MenuItem>
    </div>
  );
};
