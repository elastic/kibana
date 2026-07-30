/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type ReactNode } from 'react';
import { map } from 'rxjs';
import { Navigation as NavigationComponent } from '@kbn/ui-side-navigation';
import type { MenuItem } from '@kbn/ui-side-navigation/types';
import classnames from 'classnames';
import type { SolutionId } from '@kbn/core-chrome-browser';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import { useBasePath } from '../../../shared/chrome_hooks';
import type { NavigationItems } from './to_navigation_items';
import { toNavigationItems } from './to_navigation_items';
import { PanelStateManager } from './panel_state_manager';

export interface ChromeNavigationProps {
  isCollapsed: boolean;
  setWidth: (width: number) => void;
  onToggleCollapsed?: (isCollapsed: boolean) => void;
}

/**
 * Opt-in extension slot: an app can register a render function on `globalThis`
 * to inject content into the side panel footer, scoped to the opened panel.
 * Used by the Entity-centric lab (super-short-term) to show a "grouped
 * favorites" toggle at the bottom of the Infrastructure panel without coupling
 * chrome to any solution plugin. Absent for every other nav.
 */
type SidePanelSlotRenderer = (openerNode: MenuItem) => ReactNode;
const SIDE_PANEL_FOOTER_GLOBAL_KEY = '__kbnSideNavPanelFooter__' as const;
const SIDE_PANEL_HEADER_GLOBAL_KEY = '__kbnSideNavPanelHeader__' as const;

/**
 * Companion to the header/footer slots: a render function keyed by section id
 * that returns a right-aligned action (e.g. a settings cog) for a side-panel
 * section header. Used by the Entity-centric lab (super-short-term) to attach a
 * "manage groups" cog to the "Starred integrations" section. Absent for every
 * other nav.
 */
type SectionActionRenderer = (sectionId: string) => ReactNode;
const SIDE_PANEL_SECTION_ACTION_GLOBAL_KEY = '__kbnSideNavSectionAction__' as const;

const getRegisteredSidePanelFooter = (): SidePanelSlotRenderer | undefined => {
  const root = globalThis as unknown as Record<string, SidePanelSlotRenderer | undefined>;
  return root[SIDE_PANEL_FOOTER_GLOBAL_KEY];
};

const getRegisteredSidePanelHeader = (): SidePanelSlotRenderer | undefined => {
  const root = globalThis as unknown as Record<string, SidePanelSlotRenderer | undefined>;
  return root[SIDE_PANEL_HEADER_GLOBAL_KEY];
};

const getRegisteredSectionAction = (): SectionActionRenderer | undefined => {
  const root = globalThis as unknown as Record<string, SectionActionRenderer | undefined>;
  return root[SIDE_PANEL_SECTION_ACTION_GLOBAL_KEY];
};

export const Navigation = (props: ChromeNavigationProps) => {
  const state = useNavigationItems();

  if (!state) {
    return null;
  }

  const { navItems, logoItem, activeItemId, solutionId } = state;
  const sidePanelFooter = getRegisteredSidePanelFooter();
  const sidePanelHeader = getRegisteredSidePanelHeader();
  const getSectionAction = getRegisteredSectionAction();

  return (
    <KibanaSectionErrorBoundary sectionName={'Navigation'} maxRetries={3}>
      <NavigationComponent
        items={navItems}
        logo={logoItem}
        isCollapsed={props.isCollapsed}
        setWidth={props.setWidth}
        onToggleCollapsed={props.onToggleCollapsed}
        activeItemId={activeItemId}
        sidePanelFooter={sidePanelFooter}
        sidePanelHeader={sidePanelHeader}
        getSectionAction={getSectionAction}
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
    return chrome.project.getNavigation$().pipe(
      map((nav) => ({
        ...toNavigationItems(nav.navigationTree, nav.activeNodes, panelStateManager),
        solutionId: nav.solutionId,
      }))
    );
  }, [chrome, basePath]);

  return useObservable(items$, null);
};
