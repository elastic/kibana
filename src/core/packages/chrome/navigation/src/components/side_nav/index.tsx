/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { FC, ReactNode } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme, useIsWithinBreakpoints, type UseEuiTheme } from '@elastic/eui';
import { layoutLevels } from '@kbn/core-chrome-layout-constants';

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

const getEditingStyles = (position: DOMRect, theme: UseEuiTheme['euiTheme']) => css`
  position: fixed;
  top: ${position.top}px;
  left: ${position.left}px;
  z-index: ${layoutLevels.navigationEditing};
  background: ${theme.colors.backgroundBasePlain};
  pointer-events: none;
`;

export interface SideNavProps {
  children: ReactNode;
  isCollapsed: boolean;
  /** When true, renders the nav in a portal above the modal overlay for live preview */
  isEditing?: boolean;
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
export const SideNav: SideNavComponent = ({ children, isCollapsed, isEditing = false }) => {
  const { euiTheme } = useEuiTheme();
  const [navPosition, setNavPosition] = useState<DOMRect | null>(null);
  // Don't portal on mobile/small screens where customize navigation modal goes fullscreen
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  const shouldPortal = isEditing && !isMobile;

  const wrapperStyles = useMemo(
    () => getNavWrapperStyles(euiTheme, isCollapsed),
    [euiTheme, isCollapsed]
  );

  const editingStyles = useMemo(
    () => (navPosition ? getEditingStyles(navPosition, euiTheme) : null),
    [navPosition, euiTheme]
  );

  // Capture position when entering portal mode
  useEffect(() => {
    if (shouldPortal && !navPosition) {
      const navElement = document.querySelector(`.${NAVIGATION_ROOT_SELECTOR}`);
      if (navElement) {
        setNavPosition(navElement.getBoundingClientRect());
      }
    }
  }, [shouldPortal, navPosition]);

  // Reset position when exiting portal mode
  useEffect(() => {
    if (!shouldPortal) {
      setNavPosition(null);
    }
  }, [shouldPortal]);

  const navContent = (
    <div className={NAVIGATION_ROOT_SELECTOR} css={[wrapperStyles, shouldPortal && editingStyles]}>
      {children}
    </div>
  );

  // When portaling, render empty placeholder to hold space + portal above the modal
  if (shouldPortal && navPosition) {
    return (
      <>
        <div css={wrapperStyles} />
        {createPortal(navContent, document.body)}
      </>
    );
  }

  return navContent;
};

SideNav.Logo = Logo;
SideNav.PrimaryMenu = PrimaryMenu;
SideNav.Popover = Popover;
SideNav.SecondaryMenu = SecondaryMenu;
SideNav.NestedSecondaryMenu = NestedSecondaryMenu;
SideNav.Footer = Footer;
SideNav.SidePanel = SidePanel;
