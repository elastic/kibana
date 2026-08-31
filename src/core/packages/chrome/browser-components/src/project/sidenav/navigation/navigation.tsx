/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type ReactNode } from 'react';
import { css } from '@emotion/react';
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
    const registeredSections$ = chrome.project.getRegisteredNavigationSections$();
    const registeredPanels$ = chrome.project.getRegisteredNavigationPanels$();

    const tree$ = navigation$.pipe(
      map(({ navigationTree }) => navigationTree),
      distinctUntilChanged()
    );

    const resolvedSections$ = combineLatest([
      tree$,
      registeredSections$.pipe(distinctUntilChanged()),
    ]).pipe(switchMap(([tree, sections]) => resolveLinksContent(tree, sections)));

    const resolvedPanels$ = combineLatest([
      tree$,
      registeredPanels$.pipe(distinctUntilChanged()),
    ]).pipe(map(([tree, panels]) => resolvePanelContent(tree, panels)));

    const resolvedContent$ = combineLatest([resolvedSections$, resolvedPanels$]).pipe(
      map(([links, panels]) => ({ links, panels }))
    );

    const panelElements = new Map<string, ReactNode>();

    return combineLatest([navigation$, resolvedContent$]).pipe(
      map(([nav, resolved]) => ({
        ...attachPanelContent(
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
        ),
        solutionId: nav.solutionId,
      }))
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

const panelHostStyles = css`
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

export const NavigationPanelHost = ({
  hostRef,
}: {
  hostRef: (element: HTMLElement | null) => void;
}) => <div ref={hostRef} css={panelHostStyles} />;

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
      element = <NavigationPanelHost hostRef={panel.hostRef} />;
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
