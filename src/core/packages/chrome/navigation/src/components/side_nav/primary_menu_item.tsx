/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, ForwardedRef, ReactNode } from 'react';
import { css } from '@emotion/react';
import { EuiToolTip, IconType } from '@elastic/eui';

import { MenuItem } from '../../../types';
import { MenuItem as MenuItemComponent } from '../menu_item';

export interface SideNavPrimaryMenuItemProps extends MenuItem {
  as?: 'a' | 'button';
  children: ReactNode;
  hasContent?: boolean;
  iconType: IconType;
  isActive: boolean;
  isCollapsed: boolean;
  isHorizontal?: boolean;
  onClick?: () => void;
}

export const SideNavPrimaryMenuItem = forwardRef<HTMLAnchorElement, SideNavPrimaryMenuItemProps>(
  (
    { children, hasContent, href, iconType, id, isActive, isCollapsed, isHorizontal, ...props },
    ref: ForwardedRef<HTMLAnchorElement>
  ): JSX.Element => {
    const wrapperStyles = css`
      display: flex;
      justify-content: center;
      width: 100%;
    `;

    const menuItem = (
      <MenuItemComponent
        data-test-subj={`sideNavPrimaryMenuItem-${id}`}
        href={href}
        iconType={iconType}
        isActive={isActive}
        isHorizontal={isHorizontal}
        isLabelVisible={isHorizontal ? true : !isCollapsed}
        ref={ref}
        {...props}
      >
        {children}
      </MenuItemComponent>
    );

    if (!isHorizontal && isCollapsed && !hasContent) {
      return (
        <EuiToolTip
          anchorProps={{
            css: wrapperStyles,
          }}
          content={children}
          position="right"
          disableScreenReaderOutput
        >
          {menuItem}
        </EuiToolTip>
      );
    }

    return menuItem;
  }
);
