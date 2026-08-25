/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, useMemo, type ComponentType, type ReactNode } from 'react';
import { combineLatest, distinctUntilChanged, map, switchMap } from 'rxjs';
import { Navigation as NavigationComponent } from '@kbn/ui-side-navigation';
import classnames from 'classnames';
import type { SolutionId } from '@kbn/core-chrome-browser';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import type { MenuItem } from '@kbn/ui-side-navigation/types';
import { useBasePath } from '../../../shared/chrome_hooks';
import type { NavigationItems } from './to_navigation_items';
import { toNavigationItems } from './to_navigation_items';
import {
  attachPopoverSections,
  findActivePopoverItemId,
  resolveLinksContent,
  resolvePanelContent,
  type ResolvedPanelContent,
} from './resolve_navigation_content';
import { PanelStateManager } from './panel_state_manager';

export interface ChromeNavigationProps {
  isCollapsed: boolean;
  setWidth: (width: number) => void;
  onToggleCollapsed?: (isCollapsed: boolean) => void;
}

export const Navigation = (props: ChromeNavigationProps) => {
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
        isCollapsed={props.isCollapsed}
        setWidth={props.setWidth}
        onToggleCollapsed={props.onToggleCollapsed}
        onCustomizeNavigation={onCustomizeNavigation}
        activeItemId={activeItemId}
        data-test-subj={classnames(`${solutionId}SideNav`, 'projectSideNav', 'projectSideNavV2')}
      />
    </KibanaSectionErrorBoundary>
  );
};

// For the React.Lazy import to work correctly, we need to export the component as default
// eslint-disable-next-line import/no-default-export
export default Navigation;

const useNavigationItems = (): (NavigationItems & { solutionId: SolutionId }) | null => {
  const chrome = useChromeService();
  const basePath = useBasePath();

  const items$ = useMemo(() => {
    const panelStateManager = new PanelStateManager(basePath.get());
    const navigation$ = chrome.project.getNavigation$();
    const registeredContent$ = chrome.project.getRegisteredNavigationContent$();

    const tree$ = navigation$.pipe(
      map(({ navigationTree }) => navigationTree),
      distinctUntilChanged()
    );

    const resolvedContent$ = combineLatest([
      tree$,
      registeredContent$.pipe(distinctUntilChanged()),
    ]).pipe(
      switchMap(([tree, contents]) =>
        resolveLinksContent(tree, contents).pipe(
          map((links) => ({
            links,
            panels: resolvePanelContent(tree, contents),
          }))
        )
      )
    );

    const panelElements = new Map<string, ReactNode>();

    return combineLatest([navigation$, resolvedContent$]).pipe(
      map(([nav, resolved]) => {
        const items = attachPanelContent(
          attachPopoverSections(
            toNavigationItems(
              nav.navigationTree,
              nav.activeNodes,
              nav.overflowItemIds,
              panelStateManager
            ),
            resolved.links
          ),
          resolved.panels,
          panelElements
        );
        const popoverActiveId = findActivePopoverItemId(
          resolved.links,
          `${window.location.pathname}${window.location.hash}`
        );
        return {
          ...items,
          activeItemId: popoverActiveId ?? items.activeItemId,
          solutionId: nav.solutionId,
        };
      })
    );
  }, [chrome, basePath]);

  return useObservable(items$, null);
};

const useCustomizeNavigation = (): (() => void) | undefined => {
  const chrome = useChromeService();
  const handler$ = useMemo(() => chrome.project.getCustomizeNavigationHandler$(), [chrome]);
  const handler = useObservable(handler$, null);
  return handler ?? undefined;
};

const NavigationPanelLoader = ({ load }: { load: () => Promise<{ default: ComponentType }> }) => {
  const LazyPanel = useMemo(() => React.lazy(load), [load]);
  return (
    <Suspense fallback={null}>
      <LazyPanel />
    </Suspense>
  );
};

const attachPanelContent = (
  navigationItems: NavigationItems,
  panels: readonly ResolvedPanelContent[],
  cache: Map<string, ReactNode>
): NavigationItems => {
  if (panels.length === 0) {
    return navigationItems;
  }

  const byNodeId = new Map(panels.map((panel) => [panel.nodeId, panel]));

  const attach = (item: MenuItem): MenuItem => {
    const panel = byNodeId.get(item.id);
    if (!panel) {
      return item;
    }
    let element = cache.get(panel.nodeId);
    if (!element) {
      element = <NavigationPanelLoader load={panel.load} />;
      cache.set(panel.nodeId, element);
    }
    return { ...item, panelContent: element };
  };

  return {
    ...navigationItems,
    navItems: {
      primaryItems: navigationItems.navItems.primaryItems.map(attach),
      overflowItems: navigationItems.navItems.overflowItems?.map(attach),
      footerItems: navigationItems.navItems.footerItems.map(attach),
    },
  };
};
