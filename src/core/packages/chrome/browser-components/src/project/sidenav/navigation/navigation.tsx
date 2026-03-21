/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { map } from 'rxjs';
import { Navigation as NavigationComponent } from '@kbn/core-chrome-navigation';
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
  onToggleCollapsed: (isCollapsed: boolean) => void;
}

export const Navigation = (props: ChromeNavigationProps) => {
  const state = useNavigationItems();

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
