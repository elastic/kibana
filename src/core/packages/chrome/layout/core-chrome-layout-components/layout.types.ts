/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

/**
 * Dimensions for each layout section in the Chrome UI.
 *
 * This interface defines the pixel sizes for key layout areas such as banner, footer, header,
 * navigation, and sidebar, including their respective panel widths.
 */
export interface LayoutDimensions {
  bannerHeight: number;
  footerHeight: number;
  headerHeight: number;
  navigationWidth: number;
  sidebarWidth: number;
  sidebarPanelWidth: number;
  applicationTopBarHeight: number;
  applicationBottomBarHeight: number;
}

/**
 * The state of the layout.
 */
export interface LayoutState extends LayoutDimensions {
  hasBanner: boolean;
  hasFooter: boolean;
  hasSidebar: boolean;
  hasSidebarPanel: boolean;
  hasHeader: boolean;
  hasNavigation: boolean;
  hasApplicationTopBar: boolean;
  hasApplicationBottomBar: boolean;
}

/**
 * Props for the slots.
 */
export type SlotProps = LayoutState;

/**
 * A slot is a React node or a function that returns a React node.
 */
export type Slot = React.ReactNode | ((props: SlotProps) => React.ReactNode);

/**
 * Supported slots for the layout
 */
export interface ChromeLayoutSlots {
  header?: Slot | null;
  navigation?: Slot | null;
  banner?: Slot | null;
  footer?: Slot | null;
  sidebarPanel?: Slot | null;
  sidebar?: Slot | null;
  applicationTopBar?: Slot | null;
  applicationBottomBar?: Slot | null;
}
