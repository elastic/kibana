/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { SerializedStyles } from '@emotion/react';
import { LayoutApplication } from './application';
import { LayoutBanner } from './banner';
import { LayoutNavigation, LayoutNavigationPanel } from './navigation';
import { LayoutFooter } from './footer';
import { LayoutHeader } from './header';
import { LayoutSidebar, LayoutSidebarPanel } from './sidebar';

import { LayoutStyleArgs, useLayoutStyles } from './layout.styles';
import { LayoutGlobalCSSProps } from './layout_global_css';

interface SlotProps extends LayoutStyleArgs {
  hasBanner: boolean;
  hasFooter: boolean;
  hasSidebar: boolean;
  hasSidebarPanel: boolean;
  hasHeader: boolean;
  hasNavigation: boolean;
}

type Slot = (props: SlotProps) => React.ReactNode;

export interface ChromeLayoutComponentProps extends LayoutGlobalCSSProps {
  // TODO: add possibility to pass custom CSS styles for other components?
  applicationCSS?: SerializedStyles;
  children: {
    Header?: Slot;
    Application: Slot;
    Navigation?: Slot;
    NavigationPanel?: Slot | null;
    Banner?: Slot | null;
    Footer?: Slot | null;
    SidebarPanel?: Slot | null;
    Sidebar?: Slot | null;
  };
}

export const ChromeLayoutComponent = ({
  applicationCSS,
  children: {
    Application,
    Banner,
    Header,
    Navigation,
    NavigationPanel,
    Footer,
    SidebarPanel,
    Sidebar,
  },
  ...props
}: ChromeLayoutComponentProps) => {
  const hasBanner = !!Banner;
  const hasFooter = !!Footer;
  const hasSidebar = !!Sidebar;
  const hasSidebarPanel = !!SidebarPanel;
  const hasNavigationPanel = !!NavigationPanel;

  const hasHeader = !!Header;
  const hasNavigation = !!Navigation;

  const styleProps: LayoutStyleArgs = {
    ...props,
    bannerHeight: hasBanner ? props.bannerHeight : 0,
    footerHeight: hasFooter ? props.footerHeight : 0,
    headerHeight: hasHeader ? props.headerHeight : 0,
    navigationWidth: hasNavigation ? props.navigationWidth : 0,
    navigationPanelWidth: hasNavigationPanel ? props.navigationPanelWidth : 0,
    sidebarWidth: hasSidebar ? props.sidebarWidth : 0,
    sidebarPanelWidth: hasSidebar && hasSidebarPanel ? props.sidebarPanelWidth : 0,
  };

  const styles = useLayoutStyles(styleProps);

  const slotProps: SlotProps = {
    hasHeader,
    hasNavigation,
    hasBanner,
    hasFooter,
    hasSidebar,
    hasSidebarPanel,
    ...styleProps,
  };

  const banner = hasBanner ? (
    <LayoutBanner height={styleProps.bannerHeight}>{Banner(slotProps)}</LayoutBanner>
  ) : null;

  const footer = hasFooter ? (
    <LayoutFooter height={styleProps.footerHeight}>{Footer(slotProps)}</LayoutFooter>
  ) : null;

  const navigationPanel = hasNavigationPanel ? (
    <LayoutNavigationPanel width={styleProps.navigationPanelWidth}>
      {NavigationPanel(slotProps)}
    </LayoutNavigationPanel>
  ) : null;

  const sidebar = hasSidebar ? (
    <LayoutSidebar width={styleProps.sidebarWidth}>{Sidebar(slotProps)}</LayoutSidebar>
  ) : null;

  const sidebarPanel =
    hasSidebar && hasSidebarPanel ? (
      <LayoutSidebarPanel width={styleProps.sidebarPanelWidth}>
        {SidebarPanel(slotProps)}
      </LayoutSidebarPanel>
    ) : null;

  const header = Header ? (
    <LayoutHeader top={styleProps.bannerHeight} height={styleProps.headerHeight}>
      {Header(slotProps)}
    </LayoutHeader>
  ) : null;

  const navigation = Navigation ? (
    <LayoutNavigation width={styleProps.navigationWidth}>{Navigation(slotProps)}</LayoutNavigation>
  ) : null;

  return (
    <div css={styles}>
      {banner}
      {header}
      {navigation}
      {navigationPanel}
      <LayoutApplication applicationCSS={applicationCSS}>
        {Application(slotProps)}
      </LayoutApplication>
      {footer}
      {sidebar}
      {sidebarPanel}
    </div>
  );
};
