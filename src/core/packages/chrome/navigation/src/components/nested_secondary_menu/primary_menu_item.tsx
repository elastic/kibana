/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ComponentProps, FC, ReactNode, useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiButtonIcon, useEuiTheme } from '@elastic/eui';

import { SideNav } from '../side_nav';
import { useNestedMenu } from './use_nested_menu';

export interface PrimaryMenuItemProps
  extends Omit<ComponentProps<typeof SideNav.PrimaryMenuItem>, 'children' | 'isActive'> {
  children: ReactNode;
  hasSubmenu?: boolean;
  isActive?: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
  submenuPanelId?: string;
}

export const PrimaryMenuItem: FC<PrimaryMenuItemProps> = ({
  children,
  hasSubmenu = false,
  isActive = false,
  onClick,
  submenuPanelId,
  ...props
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
      <SideNav.PrimaryMenuItem isHorizontal isActive={isActive} onClick={handleClick} {...props}>
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
