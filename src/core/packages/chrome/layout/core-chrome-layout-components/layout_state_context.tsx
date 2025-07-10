/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, ReactNode, useContext } from 'react';
import { ChromeLayoutSlots, LayoutState } from './layout.types';
import { useLayoutConfig } from './layout_config_context';

export interface LayoutStateProps extends ChromeLayoutSlots {
  children: ReactNode;
}

const LayoutStateContext = createContext<LayoutState | undefined>(undefined);

/**
 * The layout state provider component.
 * Wires up the LayoutConfig to the layout state.
 *
 * @param props - Props for the LayoutStateProvider component.
 * @returns The rendered LayoutStateProvider component.
 */
export const LayoutStateProvider = ({ children, ...props }: LayoutStateProps) => {
  // Get layout config from context
  const layoutConfig = useLayoutConfig();
  const slots = {
    Header: props.header || null,
    Navigation: props.navigation || null,
    NavigationPanel: props.navigationPanel || null,
    Banner: props.banner || null,
    Footer: props.footer || null,
    SidebarPanel: props.sidebarPanel || null,
    Sidebar: props.sidebar || null,
    ApplicationTopBar: props.applicationTopBar || null,
    ApplicationBottomBar: props.applicationBottomBar || null,
  };

  const hasBanner = !!slots.Banner;
  const hasFooter = !!slots.Footer;
  const hasSidebar = !!slots.Sidebar;
  const hasSidebarPanel = !!slots.SidebarPanel;
  const hasNavigationPanel = !!slots.NavigationPanel;
  const hasHeader = !!slots.Header;
  const hasNavigation = !!slots.Navigation;
  const hasApplicationTopBar = !!slots.ApplicationTopBar;
  const hasApplicationBottomBar = !!slots.ApplicationBottomBar;

  const layoutState: LayoutState = {
    hasBanner,
    bannerHeight: hasBanner ? layoutConfig.bannerHeight ?? 0 : 0,
    hasFooter,
    footerHeight: hasFooter ? layoutConfig.footerHeight ?? 0 : 0,
    hasHeader,
    headerHeight: hasHeader ? layoutConfig.headerHeight ?? 0 : 0,
    hasNavigation,
    navigationWidth: hasNavigation ? layoutConfig.navigationWidth ?? 0 : 0,
    hasNavigationPanel,
    navigationPanelWidth: hasNavigationPanel ? layoutConfig.navigationPanelWidth ?? 0 : 0,
    hasSidebar,
    sidebarWidth: hasSidebar ? layoutConfig.sidebarWidth ?? 0 : 0,
    hasSidebarPanel,
    sidebarPanelWidth: hasSidebar && hasSidebarPanel ? layoutConfig.sidebarPanelWidth ?? 0 : 0,
    hasApplicationTopBar,
    applicationTopBarHeight: hasApplicationTopBar ? layoutConfig.applicationTopBarHeight ?? 0 : 0,
    hasApplicationBottomBar,
    applicationBottomBarHeight: hasApplicationBottomBar
      ? layoutConfig.applicationBottomBarHeight ?? 0
      : 0,
  };

  return <LayoutStateContext.Provider value={layoutState}>{children}</LayoutStateContext.Provider>;
};

export const useLayoutState = () => {
  const context = useContext(LayoutStateContext);
  if (context === undefined) {
    throw new Error('useLayoutState must be used within a LayoutStateProvider');
  }
  return context;
};
