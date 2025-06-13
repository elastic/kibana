/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

export interface LayoutStyleArgs {
  bannerHeight: number;
  footerHeight: number;
  headerHeight: number;
  navigationWidth: number;
  navigationPanelWidth: number;
  sidebarWidth: number;
  sidebarPanelWidth: number;
}

export interface LayoutState extends LayoutStyleArgs {
  hasBanner: boolean;
  hasFooter: boolean;
  hasSidebar: boolean;
  hasSidebarPanel: boolean;
  hasHeader: boolean;
  hasNavigation: boolean;
  hasNavigationPanel: boolean;
}

export type SlotProps = LayoutState;

export type Slot = React.ReactNode | ((props: SlotProps) => React.ReactNode);

export interface ChromeLayoutSlots {
  header?: Slot | null;
  navigation?: Slot | null;
  navigationPanel?: Slot | null;
  banner?: Slot | null;
  footer?: Slot | null;
  sidebarPanel?: Slot | null;
  sidebar?: Slot | null;
}
