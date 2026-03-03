/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { Navigation as NavigationComponent } from '@kbn/core-chrome-navigation';
import type { Observable } from 'rxjs';
import classnames from 'classnames';
import type {
  ChromeNavLink,
  ChromeProjectNavigationNode,
  NavigationTreeDefinitionUI,
  SolutionId,
} from '@kbn/core-chrome-browser';
import type { IBasePath as BasePath } from '@kbn/core-http-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { KibanaSectionErrorBoundary } from '@kbn/shared-ux-error-boundary';
import useObservable from 'react-use/lib/useObservable';
import type { NavigationItems } from './to_navigation_items';
import { toNavigationItems } from './to_navigation_items';
import { PanelStateManager } from './panel_state_manager';

export interface ChromeNavigationProps {
  // sidenav state
  isCollapsed: boolean;
  setWidth: (width: number) => void;
  isEditing$: Observable<boolean>;

  // kibana deps
  basePath: BasePath;
  application: Pick<ApplicationStart, 'navigateToUrl' | 'currentAppId$'>;

  // nav state
  navigation$: Observable<{
    solutionId: SolutionId;
    navigationTree: NavigationTreeDefinitionUI;
    activeNodes: ChromeProjectNavigationNode[][];
  }>;
  navLinks$: Observable<Readonly<ChromeNavLink[]>>;

  // collapse toggle callback
  onToggleCollapsed: (isCollapsed: boolean) => void;
}

export const Navigation = (props: ChromeNavigationProps) => {
  const state = useNavigationItems(props);
  const isEditing = useObservable(props.isEditing$, false);

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
        isEditing={isEditing}
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

const useNavigationItems = (
  props: Pick<ChromeNavigationProps, 'navigation$' | 'navLinks$' | 'basePath'>
): (NavigationItems & { solutionId: SolutionId }) | null => {
  const state = useObservable(props.navigation$);

  const basePath = props.basePath.get();
  const panelStateManager = useMemo(() => new PanelStateManager(basePath), [basePath]);

  const memoizedItems = useMemo(() => {
    if (!state) return null;
    return {
      ...toNavigationItems(state.navigationTree, state.activeNodes, panelStateManager),
      solutionId: state.solutionId,
    };
  }, [state, panelStateManager]);

  return memoizedItems;
};
