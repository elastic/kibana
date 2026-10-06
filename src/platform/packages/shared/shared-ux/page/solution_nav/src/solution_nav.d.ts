/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC } from 'react';
import type React from 'react';
import type { EuiAvatarProps, EuiFlyoutProps, EuiSideNavProps } from '@elastic/eui';
/**
 * Props for the `SolutionNav` component.
 */
export type SolutionNavProps = Omit<EuiSideNavProps<{}>, 'children' | 'items' | 'heading'> & {
  /**
   * Name of the solution, i.e. "Observability"
   */
  name: EuiAvatarProps['name'];
  /**
   * Solution logo, i.e. "logoObservability"
   */
  icon?: EuiAvatarProps['iconType'];
  /**
   *  An array of #EuiSideNavItem objects. Lists navigation menu items.
   */
  items?: EuiSideNavProps<{}>['items'];
  /**
   *  Renders the children instead of default EuiSideNav
   */
  children?: React.ReactNode;
  /**
   * The position of the close button when the navigation flyout is open.
   * Note that side navigation turns into a flyout only when the screen has medium size.
   */
  closeFlyoutButtonPosition?: EuiFlyoutProps['closeButtonPosition'];
  /**
   * Control the collapsed state
   */
  isOpenOnDesktop?: boolean;
  /**
   * Handler for when the navigation flyout is collapsed.
   */
  onCollapse?: () => void;
  /**
   * Allows hiding of the navigation by the user.
   * If false, forces all breakpoint versions into the open state without the ability to hide.
   */
  canBeCollapsed?: boolean;
  /**
   * Optional content to render at the bottom of the nav, pinned below the scrollable nav items.
   * Hidden when the nav is collapsed.
   */
  footer?: React.ReactNode;
};
/**
 * A wrapper around `EuiSideNav` that includes the appropriate title with optional solution logo.
 */
export declare const SolutionNav: FC<SolutionNavProps>;
