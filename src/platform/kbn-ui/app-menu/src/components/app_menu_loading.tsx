/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSkeletonRectangle, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { APP_MENU_ITEM_LIMIT } from '../constants';
import { APP_MENU_TEST_SUBJECTS } from '../test_subjects';
import {
  AppMenuApplicationResponsiveContent,
  AppMenuViewportResponsiveContent,
  type AppMenuBreakpointSource,
  type AppMenuLayout,
} from './app_menu_responsive';

/**
 * Approximate EuiButton size="s" so the primary placeholder does not jump when the real
 * action arrives. Icon placeholders use the same 32px square as the header row floor.
 */
const PRIMARY_WIDTH_PX = 96;
const DEFAULT_BUTTON_COUNT = 1;

export interface AppMenuLoadingProps {
  /**
   * App menu button placeholders on the left (overflow / secondary actions).
   * Defaults to 1. Clamped to {@link APP_MENU_ITEM_LIMIT}.
   */
  buttonCount?: number;
  /** Primary-action rectangle. Defaults to `true`. */
  hasPrimary?: boolean;
  breakpointSource?: AppMenuBreakpointSource;
}

const resolveButtonCount = (buttonCount: number | undefined): number =>
  Math.min(Math.max(buttonCount ?? DEFAULT_BUTTON_COUNT, 0), APP_MENU_ITEM_LIMIT);

const IconSkeleton = ({ announce }: { announce: boolean }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiSkeletonRectangle
      width={euiTheme.size.xl}
      height={euiTheme.size.xl}
      borderRadius="m"
      ariaWrapperProps={announce ? undefined : { 'aria-hidden': true }}
    />
  );
};

/**
 * Loading placeholder for {@link AppMenuComponent}. Uses the same responsive layout
 * selection so collapsed / minimal / expanded breakpoints match the real menu.
 */
export const AppMenuLoading = ({
  buttonCount,
  hasPrimary = true,
  breakpointSource = 'application',
}: AppMenuLoadingProps): React.ReactElement | null => {
  const { euiTheme } = useEuiTheme();
  const resolvedButtonCount = resolveButtonCount(buttonCount);

  if (resolvedButtonCount === 0 && !hasPrimary) {
    return null;
  }

  const overflowSkeleton = resolvedButtonCount > 0 ? <IconSkeleton announce /> : null;
  const primarySkeleton = hasPrimary ? (
    <EuiSkeletonRectangle
      width={PRIMARY_WIDTH_PX}
      height={euiTheme.size.xl}
      borderRadius="m"
      ariaWrapperProps={resolvedButtonCount === 0 ? undefined : { 'aria-hidden': true }}
    />
  ) : null;

  const expandedButtons = Array.from({ length: resolvedButtonCount }, (_unused, idx) => (
    <IconSkeleton key={idx} announce={idx === 0} />
  ));

  const content: Record<AppMenuLayout, React.ReactNode> = {
    // Collapsed menus always use a single overflow control; primary (if any) lives
    // inside that popover, so a primary-only menu must not show the 96px rectangle.
    collapsed: <IconSkeleton announce />,
    minimal: (
      <>
        {overflowSkeleton}
        {primarySkeleton}
      </>
    ),
    expanded: (
      <>
        {expandedButtons}
        {primarySkeleton}
      </>
    ),
  };

  const ResponsiveContent =
    breakpointSource === 'application'
      ? AppMenuApplicationResponsiveContent
      : AppMenuViewportResponsiveContent;

  return (
    <div data-test-subj={APP_MENU_TEST_SUBJECTS.loading}>
      <ResponsiveContent content={content} />
    </div>
  );
};
