/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, ReactNode, useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, IconType, useEuiTheme } from '@elastic/eui';

import { SideNav } from '../side_nav';
import { useNestedMenu } from '../../hooks/use_nested_menu';

export interface PrimaryMenuItemProps {
  children: ReactNode;
  hasSubmenu?: boolean;
  href?: string;
  iconType?: IconType;
  isCurrent?: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
  submenuPanelId?: string;
}

export const PrimaryMenuItem: FC<PrimaryMenuItemProps> = ({
  children,
  hasSubmenu = false,
  href,
  iconType,
  isCurrent = false,
  isCollapsed,
  onClick,
  submenuPanelId,
}) => {
  const { goToPanel } = useNestedMenu();
  const { euiTheme } = useEuiTheme();

  const handleClick = useCallback(() => {
    onClick?.();
    if (hasSubmenu && submenuPanelId) {
      goToPanel(submenuPanelId);
    }
  }, [onClick, hasSubmenu, submenuPanelId, goToPanel]);

  const arrowStyle = css`
    opacity: 0.6;
    pointer-events: none;
    position: absolute;
    right: ${euiTheme.size.s};
    top: 50%;
    transform: translateY(-50%);
  `;

  const wrapperStyle = css`
    display: block;
    position: relative;
    width: 100%;
  `;

  return (
    <div css={wrapperStyle}>
      <SideNav.PrimaryMenuItem
        horizontal
        href={href}
        iconType={iconType}
        isCurrent={isCurrent}
        isCollapsed={isCollapsed}
        onClick={handleClick}
      >
        {children}
      </SideNav.PrimaryMenuItem>
      {hasSubmenu && (
        <EuiButtonIcon
          aria-label={`${children} has submenu`}
          color="text"
          css={arrowStyle}
          display="empty"
          iconType="arrowRight"
          size="xs"
        />
      )}
    </div>
  );
};
