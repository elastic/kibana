/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { combineLatest, map } from 'rxjs';
import { Navigation as NavigationComponent } from '@kbn/core-chrome-navigation';
import classnames from 'classnames';
import type { SolutionId } from '@kbn/core-chrome-browser';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import type { ToolSlots } from '@kbn/core-chrome-navigation/types';
import { useBasePath, useIsNextChrome } from '../../../shared/chrome_hooks';
import { useHelpLinks$ } from '../../../shared/help_links_hooks';
import type { NavigationItems } from './to_navigation_items';
import { toNavigationItems } from './to_navigation_items';
import { buildToolSlots } from './to_chrome_tool_slots';
import { PanelStateManager } from './panel_state_manager';

export interface ChromeNavigationProps {
  isCollapsed: boolean;
  setWidth: (width: number) => void;
  onToggleCollapsed?: (isCollapsed: boolean) => void;
}

export const Navigation = (props: ChromeNavigationProps) => {
  const state = useNavigationItems();

  if (!state) {
    return null;
  }

  const { navItems, logoItem, activeItemId, solutionId, toolSlots } = state;

  return (
    <KibanaSectionErrorBoundary sectionName={'Navigation'} maxRetries={3}>
      <NavigationComponent
        items={navItems}
        tools={toolSlots}
        logo={logoItem}
        isCollapsed={props.isCollapsed}
        setWidth={props.setWidth}
        onToggleCollapsed={props.onToggleCollapsed}
        activeItemId={activeItemId}
        data-test-subj={classnames(`${solutionId}SideNav`, 'projectSideNav', 'projectSideNavV2')}
      />
    </KibanaSectionErrorBoundary>
  );
};

// For the React.Lazy import to work correctly, we need to export the component as default
// eslint-disable-next-line import/no-default-export
export default Navigation;

interface NavigationState extends NavigationItems {
  solutionId: SolutionId;
  toolSlots: ToolSlots;
}

const useNavigationItems = (): NavigationState | null => {
  const chrome = useChromeService();
  const basePath = useBasePath();
  const helpLinks$ = useHelpLinks$();
  const isNextChrome = useIsNextChrome();

  const items$ = useMemo(() => {
    const panelStateManager = new PanelStateManager(basePath.get());

    const navState$ = chrome.project.getNavigation$().pipe(
      map((nav) => {
        const { navItems, logoItem, activeItemId } = toNavigationItems(
          nav.navigationTree,
          nav.activeNodes,
          panelStateManager
        );
        return {
          solutionId: nav.solutionId,
          // In the `next-chrome` we want to show the elastic logo instead of the default product logo
          logoItem: isNextChrome
            ? {
                ...logoItem,
                iconType: 'logoElastic' as const,
                iconColor: 'text' as const,
                hideLabel: true,
              }
            : logoItem,
          activeItemId,
          navItems,
        };
      })
    );

    const emptyToolSlots: ToolSlots = { headerTools: [], footerTools: [] };

    const toolSlots$ = isNextChrome
      ? combineLatest([
          chrome.next.globalSearch.get$(),
          chrome.next.spaceSelector.get$(),
          chrome.next.userMenu.get$(),
          helpLinks$,
        ]).pipe(
          map(([searchConfig, spaceSelectorConfig, userMenuConfig, helpLinks]) =>
            buildToolSlots({
              globalSearch: searchConfig,
              spaceSelector: spaceSelectorConfig,
              userMenu: userMenuConfig,
              helpLinks,
            })
          )
        )
      : [emptyToolSlots];

    return combineLatest([navState$, toolSlots$]).pipe(
      map(([navState, toolSlots]) => ({
        ...navState,
        toolSlots,
      }))
    );
  }, [chrome, basePath, helpLinks$, isNextChrome]);

  return useObservable(items$, null);
};
