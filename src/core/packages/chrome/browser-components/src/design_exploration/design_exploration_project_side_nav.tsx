/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, type ReactNode } from 'react';
import { css, Global } from '@emotion/react';
import { Navigation as NavigationComponent } from '@kbn/ui-side-navigation';
import classnames from 'classnames';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { useSideNavCollapsed, useSidebarWidth } from '@kbn/core-chrome-browser-hooks';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { useNavigationItems, useCustomizeNavigation } from '../project/sidenav/navigation/navigation';
import { useAutoCollapse } from '../project/sidenav/use_auto_collapse';
import { DesignExplorationNavTopControls } from './design_exploration_nav_top_controls';
import { DesignExplorationNavFooterControls } from './design_exploration_nav_footer_controls';

function useSideNavSetWidth(): (width: number) => void {
  const chrome = useChromeService();
  return useCallback((width: number) => chrome.sideNav.setWidth(width), [chrome]);
}

const DesignExplorationProjectNavigation = ({
  isCollapsed,
  setWidth,
  onToggleCollapsed,
  navTopControls,
  navFooterControls,
}: {
  isCollapsed: boolean;
  setWidth: (width: number) => void;
  onToggleCollapsed?: (isCollapsed: boolean) => void;
  navTopControls?: ReactNode;
  navFooterControls?: ReactNode;
}) => {
  const state = useNavigationItems();
  const onCustomizeNavigation = useCustomizeNavigation();

  if (!state) {
    return null;
  }

  const { navItems, activeItemId, solutionId } = state;

  return (
    <KibanaSectionErrorBoundary sectionName={'Navigation'} maxRetries={3}>
      <NavigationComponent
        items={navItems}
        isCollapsed={isCollapsed}
        setWidth={setWidth}
        onToggleCollapsed={onToggleCollapsed}
        onCustomizeNavigation={onCustomizeNavigation}
        activeItemId={activeItemId}
        showTopSeparator={false}
        navTopControls={navTopControls}
        navFooterControls={navFooterControls}
        data-test-subj={classnames(
          `${solutionId}SideNav`,
          'projectSideNav',
          'projectSideNavV2',
          'designExplorationSideNav'
        )}
      />
    </KibanaSectionErrorBoundary>
  );
};

/** Headerless project side nav for design exploration — chrome actions live in nav slots. */
export const DesignExplorationProjectSideNav = () => {
  const { isCollapsed, setIsCollapsed: onToggleCollapsed } = useSideNavCollapsed();
  const setWidth = useSideNavSetWidth();
  const sidebarWidth = useSidebarWidth();
  const isAutoCollapsed = useAutoCollapse(sidebarWidth);
  const collapsed = isCollapsed || isAutoCollapsed;

  return (
    <>
      <Global
        styles={css`
          :root {
            --euiCollapsibleNavOffset: 0px;
          }
        `}
      />
      <DesignExplorationProjectNavigation
        isCollapsed={collapsed}
        setWidth={setWidth}
        onToggleCollapsed={isAutoCollapsed ? undefined : onToggleCollapsed}
        navTopControls={<DesignExplorationNavTopControls />}
        navFooterControls={<DesignExplorationNavFooterControls />}
      />
    </>
  );
};
