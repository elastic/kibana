/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, type UseEuiTheme } from '@elastic/eui';

import { COLLAPSED_WIDTH, EXPANDED_WIDTH } from '../../hooks/use_layout_width';
import { Footer } from '../footer';
import { Logo } from './logo';
import { NestedSecondaryMenu } from '../nested_secondary_menu';
import { Popover } from './popover';
import { PrimaryMenu } from '../primary_menu';
import { SecondaryMenu } from '../secondary_menu';
import { SidePanel } from './side_panel';
import { NAVIGATION_ROOT_SELECTOR } from '../../constants';

const getNavWrapperStyles = (theme: UseEuiTheme['euiTheme'], isCollapsed: boolean) => css`
  box-sizing: border-box;
  background-color: ${theme.colors.backgroundTransparent};
  display: flex;
  flex-direction: column;
  gap: ${isCollapsed ? theme.size.s : theme.size.m};
  height: 100%;
  padding-bottom: ${theme.size.s};
  width: ${isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}px;
`;

export interface SideNavProps {
  children: ReactNode;
  isCollapsed: boolean;
}

interface SideNavComponent extends FC<SideNavProps> {
  Logo: typeof Logo;
  PrimaryMenu: typeof PrimaryMenu;
  Popover: typeof Popover;
  SecondaryMenu: typeof SecondaryMenu;
  NestedSecondaryMenu: typeof NestedSecondaryMenu;
  Footer: typeof Footer;
  SidePanel: typeof SidePanel;
}

/**
 * A wrapper component for the side navigation that encapsulates:
 * - the logo,
 * - the primary menu,
 * - the secondary menu used in the popover and in the side panel,
 * - the nested secondary menu used in the "More" menu,
 * - the footer,
 * - the side panel.
 */
export const SideNav: SideNavComponent = ({ children, isCollapsed }) => {
  const { euiTheme } = useEuiTheme();

  const wrapperStyles = useMemo(
    () => getNavWrapperStyles(euiTheme, isCollapsed),
    [euiTheme, isCollapsed]
  );

  return (
    <div className={NAVIGATION_ROOT_SELECTOR} css={wrapperStyles}>
      {children}
    </div>
  );
};

SideNav.Logo = Logo;
SideNav.PrimaryMenu = PrimaryMenu;
SideNav.Popover = Popover;
SideNav.SecondaryMenu = SecondaryMenu;
SideNav.NestedSecondaryMenu = NestedSecondaryMenu;
SideNav.Footer = Footer;
SideNav.SidePanel = SidePanel;
