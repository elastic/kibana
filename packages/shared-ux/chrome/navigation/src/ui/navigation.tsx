/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, FC, useCallback, useContext, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type {
  ChromeProjectNavigationNode,
  RootNavigationItemDefinition,
  RecentlyAccessedDefinition,
  NavigationTreeDefinitionUI,
} from '@kbn/core-chrome-browser';
import type { Observable } from 'rxjs';
import { EuiCollapsibleNavBeta } from '@elastic/eui';
import {
  RecentlyAccessed,
  NavigationPanel,
  PanelProvider,
  type PanelContentProvider,
} from './components';
import { useNavigation as useNavigationService } from '../services';
import { NavigationSectionUI } from './components/navigation_section_ui';

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
  dataTestSubj?: string;
  panelContentProvider?: PanelContentProvider;
}

const NavigationComp: FC<Props> = ({ navigationTree$, dataTestSubj, panelContentProvider }) => {
  const { activeNodes$, selectedPanelNode, setSelectedPanelNode } = useNavigationService();

  const activeNodes = useObservable(activeNodes$, []);
  const navigationTree = useObservable(navigationTree$, { body: [] });

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

        if (navNode.sideNavStatus === 'hidden') {
          return null;
        }

        return <NavigationSectionUI navNode={navNode} key={navNode.id ?? i} />;
      });
    },
    []
  );

  return (
    <PanelProvider
      activeNodes={activeNodes}
      contentProvider={panelContentProvider}
      selectedNode={selectedPanelNode}
      setSelectedNode={setSelectedPanelNode}
    >
      <NavigationContext.Provider value={contextValue}>
        {/* Main navigation content */}
        <EuiCollapsibleNavBeta.Body data-test-subj={dataTestSubj}>
          {renderNodes(navigationTree.body)}
        </EuiCollapsibleNavBeta.Body>

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

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a Navigation provider');
  }
  return context;
}
