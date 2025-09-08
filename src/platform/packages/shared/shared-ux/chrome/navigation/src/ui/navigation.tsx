/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCollapsibleNavBeta, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type {
  ChromeProjectNavigationNode,
  NavigationTreeDefinitionUI,
  RecentlyAccessedDefinition,
  RootNavigationItemDefinition,
} from '@kbn/core-chrome-browser';
import type { FC } from 'react';
import React, { createContext, useCallback, useContext, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import classnames from 'classnames';
import type { Observable } from 'rxjs';
import { EMPTY } from 'rxjs';
import { useNavigation as useNavigationService } from '../services';
import {
  FeedbackBtn,
  NavigationPanel,
  NavigationSectionUI,
  PanelProvider,
  RecentlyAccessed,
} from './components';

const isRecentlyAccessedDefinition = (
  item: ChromeProjectNavigationNode | RecentlyAccessedDefinition
): item is RecentlyAccessedDefinition => {
  return (item as RootNavigationItemDefinition).type === 'recentlyAccessed';
};

interface Context {
  activeNodes: ChromeProjectNavigationNode[][];
}

const NavigationContext = createContext<Context>({
  activeNodes: [],
});

export interface Props {
  navigationTree$: Observable<NavigationTreeDefinitionUI>;
  dataTestSubj$?: Observable<string | undefined>;
}

const NavigationComp: FC<Props> = ({ navigationTree$, dataTestSubj$ }) => {
  const {
    activeNodes$,
    selectedPanelNode,
    setSelectedPanelNode,
    isFeedbackBtnVisible$,
    isSideNavCollapsed,
  } = useNavigationService();

  const dataTestSubj = useObservable(dataTestSubj$ ?? EMPTY, undefined);

  const activeNodes = useObservable(activeNodes$, []);
  const navigationTree = useObservable(navigationTree$, { id: 'es', body: [] });
  const { id: solutionId } = navigationTree;
  const isFeedbackBtnVisible = useObservable(isFeedbackBtnVisible$, false);

  const contextValue = useMemo<Context>(
    () => ({
      activeNodes,
    }),
    [activeNodes]
  );

  const renderNodes = useCallback(
    (nodes: Array<ChromeProjectNavigationNode | RecentlyAccessedDefinition | null> = []) => {
      return nodes.map((navNode, i) => {
        if (!navNode) return null;

        if (isRecentlyAccessedDefinition(navNode)) {
          return <RecentlyAccessed {...navNode} key={`recentlyAccessed-${i}`} />;
        }

        if (navNode.sideNavStatus === 'hidden' || navNode.sideNavVersion === 'v2') {
          return null;
        }

        return <NavigationSectionUI navNode={navNode} key={navNode.id ?? i} />;
      });
    },
    []
  );

  return (
    <PanelProvider selectedNode={selectedPanelNode} setSelectedNode={setSelectedPanelNode}>
      <NavigationContext.Provider value={contextValue}>
        {/* Main navigation content */}
        <EuiCollapsibleNavBeta.Body
          data-test-subj={classnames(dataTestSubj, 'projectSideNav', 'projectSideNavV1')}
        >
          <EuiFlexGroup direction="column" justifyContent="spaceBetween" css={{ height: '100%' }}>
            <EuiFlexItem>{renderNodes(navigationTree.body)}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiCollapsibleNavBeta.Body>
        {isFeedbackBtnVisible && !isSideNavCollapsed && (
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiSpacer size="s" />
              <FeedbackBtn solutionId={solutionId} />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        {navigationTree.callout && (
          <EuiFlexGroup direction="column">
            <EuiFlexItem>{renderNodes(navigationTree.callout)}</EuiFlexItem>
          </EuiFlexGroup>
        )}
        {/* Footer */}
        {navigationTree.footer && (
          <EuiCollapsibleNavBeta.Footer>
            {renderNodes(navigationTree.footer)}
          </EuiCollapsibleNavBeta.Footer>
        )}

        {/* Right side panel navigation */}
        <NavigationPanel />
      </NavigationContext.Provider>
    </PanelProvider>
  );
};

export const Navigation = React.memo(NavigationComp) as typeof NavigationComp;

/**
 * A React hook for accessing the internal state and rendering logic of the `Navigation` component.
 *
 * This hook consumes a private context set up by the `Navigation` component itself.
 * It is intended for use only by the immediate child components of `Navigation` (e.g., `NavGroup`, `NavLinks`)
 * to coordinate their rendering with the parent.
 *
 * NOTE: This is distinct from the `useNavigation` hook in `src/services.tsx`, which provides
 * access to the top-level navigation services.
 *
 * @returns The internal state of the `Navigation` component.
 * @throws If the hook is used outside of a `Navigation` component.
 */
export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a Navigation provider');
  }
  return context;
}
