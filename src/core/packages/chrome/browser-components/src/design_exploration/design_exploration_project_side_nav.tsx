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
import type { IconType } from '@elastic/eui';
import {
  COLLAPSED_WIDTH,
  EXPANDED_WIDTH,
  Navigation as NavigationComponent,
  type NavigationStructure,
} from '@kbn/ui-side-navigation';
import {
  TARGET_NAV_COLLAPSED_WIDTH,
  TARGET_NAV_EXPANDED_WIDTH,
  TARGET_SIDE_PANEL_WIDTH,
} from '@kbn/ui-chrome-layout';
import { getDesignExplorationVariant } from '@kbn/core-chrome-feature-flags';
import type { SolutionId } from '@kbn/core-chrome-browser';
import classnames from 'classnames';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { useSideNavCollapsed, useSidebarWidth } from '@kbn/core-chrome-browser-hooks';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { useNavigationItems, useCustomizeNavigation } from '../project/sidenav/navigation/navigation';
import { useAutoCollapse } from '../project/sidenav/use_auto_collapse';
import { DesignExplorationNavTopControls } from './design_exploration_nav_top_controls';
import {
  DesignExplorationNavFooterLeadingControls,
  DesignExplorationNavFooterControls,
} from './design_exploration_nav_footer_controls';

/** Space solution → EUI logo icon (mirrors spaces SpaceSolutionBadge). */
const SOLUTION_LOGO: Record<SolutionId, IconType> = {
  es: 'logoElasticsearch',
  oblt: 'logoObservability',
  security: 'logoSecurity',
  workplaceai: 'logoElasticsearch',
  vectordb: 'logoElasticsearch',
};

/** Chrome Next rail is 48/100; Intercom-like variants use a wider labeled rail. */
const WIDE_PRIMARY_NAV_WIDTHS = {
  collapsed: TARGET_NAV_COLLAPSED_WIDTH,
  expanded: TARGET_NAV_EXPANDED_WIDTH,
  sidePanel: TARGET_SIDE_PANEL_WIDTH,
} as const;

const DESIGN_EXPLORATION_NAV_WIDTHS: Record<
  string,
  { collapsed: number; expanded: number; sidePanel: number }
> = {
  target: WIDE_PRIMARY_NAV_WIDTHS,
  nirbana: WIDE_PRIMARY_NAV_WIDTHS,
  interbana: WIDE_PRIMARY_NAV_WIDTHS,
  attbana: { ...WIDE_PRIMARY_NAV_WIDTHS, collapsed: COLLAPSED_WIDTH },
};

/**
 * `useLayoutWidth` reports Chrome Next's 48/100 rail. Map to the active variant
 * so the grid column and layout CSS vars match the labeled primary nav.
 */
const mapDesignExplorationNavWidth = (reportedWidth: number): number => {
  const widths = DESIGN_EXPLORATION_NAV_WIDTHS[getDesignExplorationVariant()];
  if (!widths) {
    return reportedWidth;
  }

  const defaultSidePanelWidth = TARGET_SIDE_PANEL_WIDTH;
  const isCollapsedRail =
    reportedWidth === COLLAPSED_WIDTH || reportedWidth === COLLAPSED_WIDTH + defaultSidePanelWidth;
  const hasSidePanel =
    reportedWidth === COLLAPSED_WIDTH + defaultSidePanelWidth ||
    reportedWidth === EXPANDED_WIDTH + defaultSidePanelWidth;
  const base = isCollapsedRail ? widths.collapsed : widths.expanded;

  return hasSidePanel ? base + widths.sidePanel : base;
};

/** Design-exploration-only nav tweaks (POC). */
function adaptNavItemsForDesignExploration(
  navItems: NavigationStructure,
  solutionId: SolutionId
): NavigationStructure {
  const logo = SOLUTION_LOGO[solutionId];
  // Chrome Next forces Home to `home`; restore the space solution logo.
  let primaryItems = navItems.primaryItems.map((item) =>
    item.iconType === 'home' ? { ...item, iconType: logo } : item
  );
  let footerItems = navItems.footerItems;

  if (solutionId === 'es') {
    // Hide Getting Started; move Dev Tools to the end of the primary rail.
    const hiddenFooterIds = new Set(['search_getting_started', 'dev_tools']);
    const [devToolsItem] = footerItems.filter((item) => item.id === 'dev_tools');
    footerItems = footerItems.filter((item) => !hiddenFooterIds.has(item.id));
    if (devToolsItem) {
      primaryItems = [...primaryItems, devToolsItem];
    }
  }

  return { ...navItems, primaryItems, footerItems };
}

function useSideNavSetWidth(): (width: number) => void {
  const chrome = useChromeService();
  return useCallback(
    (width: number) => chrome.sideNav.setWidth(mapDesignExplorationNavWidth(width)),
    [chrome]
  );
}

const DesignExplorationProjectNavigation = ({
  isCollapsed,
  setWidth,
  onToggleCollapsed,
  navTopControls,
  navFooterLeadingControls,
  navFooterControls,
}: {
  isCollapsed: boolean;
  setWidth: (width: number) => void;
  onToggleCollapsed?: (isCollapsed: boolean) => void;
  navTopControls?: ReactNode;
  navFooterLeadingControls?: ReactNode;
  navFooterControls?: ReactNode;
}) => {
  const state = useNavigationItems();
  const onCustomizeNavigation = useCustomizeNavigation();

  if (!state) {
    return null;
  }

  const { navItems, activeItemId, solutionId } = state;
  const items = adaptNavItemsForDesignExploration(navItems, solutionId);

  return (
    <KibanaSectionErrorBoundary sectionName={'Navigation'} maxRetries={3}>
      <NavigationComponent
        items={items}
        isCollapsed={isCollapsed}
        setWidth={setWidth}
        onToggleCollapsed={onToggleCollapsed}
        onCustomizeNavigation={onCustomizeNavigation}
        activeItemId={activeItemId}
        showTopSeparator={false}
        navTopControls={navTopControls}
        navFooterLeadingControls={navFooterLeadingControls}
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
        navTopControls={<DesignExplorationNavTopControls isCollapsed={collapsed} />}
        navFooterLeadingControls={<DesignExplorationNavFooterLeadingControls />}
        navFooterControls={<DesignExplorationNavFooterControls />}
      />
    </>
  );
};
