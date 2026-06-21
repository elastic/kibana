/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { map } from 'rxjs';
import { Navigation as NavigationComponent } from '@kbn/ui-side-navigation';
import classnames from 'classnames';
import type { SolutionId } from '@kbn/core-chrome-browser';
import {
  renderSidePanelNestedPanel as renderRegisteredSidePanelNestedPanel,
  subscribeSidePanelNestedPanelRenderers,
} from '@kbn/core-chrome-browser';
import type { MenuItem, NavigationStructure, SecondaryMenuItem, SideNavLogo } from '@kbn/ui-side-navigation/types';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { useIsNextChrome } from '@kbn/core-chrome-browser-hooks';
import { useBasePath } from '../../../shared/chrome_hooks';
import type { NavigationItems } from './to_navigation_items';
import { toNavigationItems } from './to_navigation_items';
import { PanelStateManager } from './panel_state_manager';

export interface ChromeNavigationProps {
  isCollapsed: boolean;
  hidePrimaryLabels: boolean;
  setWidth: (width: number) => void;
  onToggleCollapsed?: (isCollapsed: boolean) => void;
}

export const Navigation = (props: ChromeNavigationProps) => {
  const state = useNavigationItems();
  const isNextChrome = useIsNextChrome();
  const [clickedActiveItemId, setClickedActiveItemId] = useState<string | undefined>();
  const [, rerenderNestedPanels] = useState(0);
  const onCustomizeNavigation = useCustomizeNavigation();

  useEffect(() => {
    return subscribeSidePanelNestedPanelRenderers(() => {
      rerenderNestedPanels((version) => version + 1);
    });
  }, []);

  useEffect(() => {
    setClickedActiveItemId(undefined);
  }, [state?.activeItemId]);

  const handleItemClick = useCallback(
    (item: MenuItem | SecondaryMenuItem | SideNavLogo) => {
      setClickedActiveItemId(item.id);

      const navItems = state?.navItemsRef.current;
      if (!navItems) {
        return;
      }

      const panels = [...navItems.primaryItems, ...navItems.footerItems];
      for (const panel of panels) {
        if (!panel.sections?.some((section) => section.items.some((navItem) => navItem.id === item.id))) {
          continue;
        }

        state.panelStateManager.setPanelLastActive(panel.id, item.id);
        return;
      }
    },
    [state]
  );

  const renderSidePanelNestedPanel = useCallback(
    (panelId: string) =>
      renderRegisteredSidePanelNestedPanel(panelId, {
        onItemClick: (item: { href: string; id: string; label: string }) => handleItemClick(item),
      }),
    [handleItemClick]
  );

  if (!state) {
    return null;
  }

  const { navItems, logoItem, activeItemId, solutionId } = state;

  return (
    <KibanaSectionErrorBoundary sectionName={'Navigation'} maxRetries={3}>
      <NavigationComponent
        items={navItems}
        logo={logoItem}
        isCollapsed={props.isCollapsed}
        hidePrimaryLabels={props.hidePrimaryLabels}
        setWidth={props.setWidth}
        onToggleCollapsed={props.onToggleCollapsed}
        activeItemId={clickedActiveItemId ?? activeItemId}
        onItemClick={handleItemClick}
        renderSidePanelNestedPanel={renderSidePanelNestedPanel}
        onCustomizeNavigation={onCustomizeNavigation}
        showTopSeparator={isNextChrome}
        data-test-subj={classnames(`${solutionId}SideNav`, 'projectSideNav', 'projectSideNavV2')}
      />
    </KibanaSectionErrorBoundary>
  );
};

// For the React.Lazy import to work correctly, we need to export the component as default
// eslint-disable-next-line import/no-default-export
export default Navigation;

const useNavigationItems = (): (NavigationItems & {
  solutionId: SolutionId;
  panelStateManager: PanelStateManager;
  navItemsRef: React.MutableRefObject<NavigationStructure | null>;
}) | null => {
  const chrome = useChromeService();
  const basePath = useBasePath();
  const isNextChrome = useIsNextChrome();
  const panelStateManager = useMemo(() => new PanelStateManager(basePath.get()), [basePath]);
  const navItemsRef = useRef<NavigationStructure | null>(null);

  const items$ = useMemo(() => {
    return chrome.project.getNavigation$().pipe(
      map((nav) => {
        const navigationItems = toNavigationItems(
          nav.navigationTree,
          nav.activeNodes,
          nav.overflowItemIds,
          panelStateManager,
          isNextChrome
        );
        navItemsRef.current = navigationItems.navItems;

        return {
          ...navigationItems,
          solutionId: nav.solutionId,
          panelStateManager,
          navItemsRef,
        };
      })
    );
  }, [chrome, basePath, isNextChrome, panelStateManager]);

  return useObservable(items$, null);
};

const useCustomizeNavigation = (): (() => void) | undefined => {
  const chrome = useChromeService();
  const handler$ = useMemo(() => chrome.project.getCustomizeNavigationHandler$(), [chrome]);
  const handler = useObservable(handler$, null);
  return handler ?? undefined;
};
