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
  ChromeRecentlyAccessedHistoryItem,
  NavigationTreeDefinitionUI,
} from '@kbn/core-chrome-browser';
import type { IBasePath as BasePath } from '@kbn/core-http-browser';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { NavigationTourManager } from '@kbn/core-chrome-navigation-tour';
import { NavigationTour } from '@kbn/core-chrome-navigation-tour';
import useObservable from 'react-use/lib/useObservable';
import { RedirectNavigationAppLinks } from './redirect_app_links';
import type { NavigationItems } from './to_navigation_items';
import { toNavigationItems } from './to_navigation_items';
import { PanelStateManager } from './panel_state_manager';
import { NavigationFeedbackSnippet } from './navigation_feedback_snippet';

export interface ChromeNavigationProps {
  // sidenav state
  isCollapsed: boolean;
  setWidth: (width: number) => void;

  // kibana deps
  basePath: BasePath;
  application: Pick<ApplicationStart, 'navigateToUrl' | 'currentAppId$'>;
  reportEvent: (eventType: string, eventData: object) => void;

  // nav state
  navigationTree$: Observable<NavigationTreeDefinitionUI>;
  navLinks$: Observable<Readonly<ChromeNavLink[]>>;
  activeNodes$: Observable<ChromeProjectNavigationNode[][]>;

  // tour
  navigationTourManager: NavigationTourManager;

  // other state that might be needed later
  recentlyAccessed$: Observable<ChromeRecentlyAccessedHistoryItem[]>;
  isFeedbackBtnVisible$: Observable<boolean>;
  loadingCount$: Observable<number>;
  dataTestSubj$?: Observable<string | undefined>;
}

export const Navigation = (props: ChromeNavigationProps) => {
  const state = useNavigationItems(props);
  const dataTestSubj = useObservable(props.dataTestSubj$ ?? EMPTY, undefined);

  if (!state) {
    return null;
  }

  const { navItems, logoItem, activeItemId, solutionId } = state;

  return (
    <>
      <NavigationTour
        tourManager={props.navigationTourManager}
        key={
          // Force remount (and reset position) the tour when the nav is collapsed/expanded
          props.isCollapsed ? 'collapsed' : 'expanded'
        }
      />
      <RedirectNavigationAppLinks application={props.application}>
        <NavigationComponent
          items={navItems}
          logo={logoItem}
          sidePanelFooter={<NavigationFeedbackSnippet solutionId={solutionId} />}
          isCollapsed={props.isCollapsed}
          setWidth={props.setWidth}
          activeItemId={activeItemId}
          data-test-subj={classnames(dataTestSubj, 'projectSideNav', 'projectSideNavV2')}
        />
      </RedirectNavigationAppLinks>
    </>
  );
};

// For the React.Lazy import to work correctly, we need to export the component as default
// eslint-disable-next-line import/no-default-export
export default Navigation;

const useNavigationItems = (
  props: Pick<ChromeNavigationProps, 'navigationTree$' | 'navLinks$' | 'activeNodes$' | 'basePath'>
): NavigationItems | null => {
  const state$ = useMemo(
    () => combineLatest([props.navigationTree$, props.navLinks$, props.activeNodes$]),
    [props.navigationTree$, props.navLinks$, props.activeNodes$]
  );
  const state = useObservable(state$);

  const basePath = props.basePath.get();
  const panelStateManager = useMemo(() => new PanelStateManager(basePath), [basePath]);

  const memoizedItems = useMemo(() => {
    if (!state) return null;
    const [navigationTree, navLinks, activeNodes] = state;
    return toNavigationItems(navigationTree, navLinks, activeNodes, panelStateManager);
  }, [state, panelStateManager]);

  return memoizedItems;
};
