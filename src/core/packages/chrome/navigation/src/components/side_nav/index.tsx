/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { FC, ReactNode } from 'react';
import React from 'react';

import { SideNavFooter } from './footer';
import { SideNavFooterItem } from './footer_item';
import { SideNavLogoComponent } from './logo';
import { SideNavPanel } from './panel';
import { SideNavPopover } from '../popover';
import { SideNavPrimaryMenu } from './primary_menu';
import { SideNavPrimaryMenuItem } from './primary_menu_item';
import { COLLAPSED_WIDTH, EXPANDED_WIDTH } from '../../hooks/use_layout_width';

export interface SideNavProps {
  children: ReactNode;
  isCollapsed: boolean;
}

interface SideNavComponent extends FC<SideNavProps> {
  Logo: typeof SideNavLogoComponent;
  PrimaryMenu: typeof SideNavPrimaryMenu;
  PrimaryMenuItem: typeof SideNavPrimaryMenuItem;
  Popover: typeof SideNavPopover;
  Footer: typeof SideNavFooter;
  FooterItem: typeof SideNavFooterItem;
  Panel: typeof SideNavPanel;
}

export const SideNav: SideNavComponent = ({ children, isCollapsed }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      className="side-nav"
      css={css`
        box-sizing: border-box;
        background-color: ${euiTheme.colors.backgroundBasePlain};
        border-right: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
        display: flex;
        flex-direction: column;
        gap: ${isCollapsed ? euiTheme.size.s : euiTheme.size.m};
        height: 100%;
        padding-bottom: ${euiTheme.size.base};
        width: ${isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}px;
      `}
    >
      {children}
    </div>
  );
};

SideNav.Logo = SideNavLogoComponent;
SideNav.PrimaryMenu = SideNavPrimaryMenu;
SideNav.PrimaryMenuItem = SideNavPrimaryMenuItem;
SideNav.Popover = SideNavPopover;
SideNav.Footer = SideNavFooter;
SideNav.FooterItem = SideNavFooterItem;
SideNav.Panel = SideNavPanel;
