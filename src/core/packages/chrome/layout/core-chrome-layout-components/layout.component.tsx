/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { LayoutApplication } from './application';
import { LayoutBanner } from './banner';
import { LayoutNavigation } from './navigation';
import { LayoutFooter } from './footer';
import { LayoutHeader } from './header';
import { LayoutSidebar, LayoutSidebarPanel } from './sidebar';

import { useLayoutStyles } from './layout.styles';
import { ChromeLayoutSlots, Slot } from './layout.types';
import { useLayoutState } from './layout_state_context';

export interface ChromeLayoutComponentProps extends ChromeLayoutSlots {
  // application
  children: Slot;
}

/**
 * The chrome layout component that composes slots together.
 *
 * @param props - ChromeLayoutComponentProps
 * @returns The rendered ChromeLayoutComponent.
 */
export const ChromeLayoutComponent = ({ children, ...props }: ChromeLayoutComponentProps) => {
  const layoutState = useLayoutState();
  const styles = useLayoutStyles(layoutState);

  const renderSlot = (slot: Slot) => {
    if (typeof slot === 'function') {
      return slot(layoutState);
    }
    return slot;
  };

  const banner = layoutState.hasBanner ? (
    <LayoutBanner>{renderSlot(props.banner)}</LayoutBanner>
  ) : null;

  const footer = layoutState.hasFooter ? (
    <LayoutFooter>{renderSlot(props.footer)}</LayoutFooter>
  ) : null;

  const sidebar = layoutState.hasSidebar ? (
    <LayoutSidebar>{renderSlot(props.sidebar)}</LayoutSidebar>
  ) : null;

  const sidebarPanel =
    layoutState.hasSidebar && layoutState.hasSidebarPanel ? (
      <LayoutSidebarPanel>{renderSlot(props.sidebarPanel)}</LayoutSidebarPanel>
    ) : null;

  const header = layoutState.hasHeader ? (
    <LayoutHeader>{renderSlot(props.header)}</LayoutHeader>
  ) : null;

  const navigation = layoutState.hasNavigation ? (
    <LayoutNavigation>{renderSlot(props.navigation)}</LayoutNavigation>
  ) : null;

  const application = (
    <LayoutApplication
      topBar={renderSlot(props.applicationTopBar)}
      bottomBar={renderSlot(props.applicationBottomBar)}
    >
      {renderSlot(children)}
    </LayoutApplication>
  );

  return (
    <div css={styles.css} style={styles.style}>
      {banner}
      {header}
      {navigation}
      {application}
      {footer}
      {sidebar}
      {sidebarPanel}
    </div>
  );
};
