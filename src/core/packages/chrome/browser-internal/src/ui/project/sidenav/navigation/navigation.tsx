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
import { combineLatest, EMPTY } from 'rxjs';
import classnames from 'classnames';
import type {
  ChromeNavLink,
  ChromeProjectNavigationNode,
  NavigationTreeDefinitionUI,
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

  // kibana deps
  basePath: BasePath;
  application: Pick<ApplicationStart, 'navigateToUrl' | 'currentAppId$'>;

  // nav state
  navigationTree$: Observable<NavigationTreeDefinitionUI>;
  navLinks$: Observable<Readonly<ChromeNavLink[]>>;
  activeNodes$: Observable<ChromeProjectNavigationNode[][]>;

  // collapse toggle callback
  onToggleCollapsed: (isCollapsed: boolean) => void;

  // other
  dataTestSubj$?: Observable<string | undefined>;
}

export const Navigation = (props: ChromeNavigationProps) => {
  const state = useNavigationItems(props);
  const dataTestSubj = useObservable(props.dataTestSubj$ ?? EMPTY, undefined);

  if (!state) {
    return null;
  }

  const { navItems, logoItem, activeItemId } = state;

  return (
    <KibanaSectionErrorBoundary sectionName={'Navigation'} maxRetries={3}>
      <NavigationComponent
        items={navItems}
        logo={logoItem}
        isCollapsed={props.isCollapsed}
        setWidth={props.setWidth}
        onToggleCollapsed={props.onToggleCollapsed}
        activeItemId={activeItemId}
        data-test-subj={classnames(dataTestSubj, 'projectSideNav', 'projectSideNavV2')}
      />
    </KibanaSectionErrorBoundary>
  );
};

// For the React.Lazy import to work correctly, we need to export the component as default
// eslint-disable-next-line import/no-default-export
export default Navigation;

const useNavigationItems = (
  props: Pick<ChromeNavigationProps, 'navigationTree$' | 'navLinks$' | 'activeNodes$' | 'basePath'>
): NavigationItems | null => {
  const state$ = useMemo(
    () => combineLatest([props.navigationTree$, props.activeNodes$]),
    [props.navigationTree$, props.activeNodes$]
  );
  const state = useObservable(state$);

  const basePath = props.basePath.get();
  const panelStateManager = useMemo(() => new PanelStateManager(basePath), [basePath]);

  const memoizedItems = useMemo(() => {
    if (!state) return null;
    const [navigationTree, activeNodes] = state;
    return toNavigationItems(navigationTree, activeNodes, panelStateManager);
  }, [state, panelStateManager]);

  return memoizedItems;
};
