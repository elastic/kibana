/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentProps, FC, ReactNode } from 'react';
import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiIcon, useEuiTheme } from '@elastic/eui';

import { SideNav } from '../side_nav';
import { useNestedMenu } from './use_nested_menu';

export interface PrimaryMenuItemProps
  extends Omit<ComponentProps<typeof SideNav.PrimaryMenuItem>, 'children' | 'isHighlighted'> {
  children: ReactNode;
  hasSubmenu?: boolean;
  isHighlighted?: boolean;
  isCurrent?: boolean;
  isCollapsed: boolean;
  onClick?: () => void;
  submenuPanelId?: string;
}

export const PrimaryMenuItem: FC<PrimaryMenuItemProps> = ({
  children,
  hasSubmenu = false,
  isHighlighted = false,
  isCurrent,
  onClick,
  submenuPanelId,
  ...props
}) => {
  const { goToPanel } = useNestedMenu();
  const { euiTheme } = useEuiTheme();

  const handleClick = useCallback(() => {
    if (hasSubmenu && submenuPanelId) {
      goToPanel(submenuPanelId);
    } else {
      onClick?.();
    }
  }, [onClick, hasSubmenu, submenuPanelId, goToPanel]);

  const arrowStyle = css`
    opacity: 0.6;
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
        isHorizontal
        isHighlighted={isHighlighted}
        isCurrent={isCurrent}
        onClick={handleClick}
        {...props}
        as={hasSubmenu ? 'button' : 'a'}
      >
        {children}
        {hasSubmenu && <EuiIcon color="text" css={arrowStyle} type="arrowRight" size="m" />}
      </SideNav.PrimaryMenuItem>
    </div>
  );
};
