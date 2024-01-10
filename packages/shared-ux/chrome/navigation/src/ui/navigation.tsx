/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, FC, useCallback, useContext, useEffect, useMemo } from 'react';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

import useObservable from 'react-use/lib/useObservable';
import { EuiCollapsibleNavBeta } from '@elastic/eui';
import type {
  RootNavigationItemDefinition,
  RecentlyAccessedDefinition,
  NavigationTreeDefinition,
} from './types';
import {
  RecentlyAccessed,
  NavigationPanel,
  PanelProvider,
  type PanelContentProvider,
} from './components';
import { parseNavigationTree } from '../utils';
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

interface Props {
  navigationTree: NavigationTreeDefinition;
  dataTestSubj?: string;
  panelContentProvider?: PanelContentProvider;
}

const NavigationComp: FC<Props> = ({
  navigationTree: _navigationTree,
  dataTestSubj,
  panelContentProvider,
}) => {
  const { cloudLinks, deepLinks$, activeNodes$, onProjectNavigationChange } =
    useNavigationService();

  const deepLinks = useObservable(deepLinks$, {});
  const activeNodes = useObservable(activeNodes$, []);

  const { navigationTree, navigationTreeUI } = useMemo(() => {
    return parseNavigationTree(_navigationTree, { deepLinks, cloudLinks });
  }, [cloudLinks, deepLinks, _navigationTree]);

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

  useEffect(() => {
    onProjectNavigationChange({ navigationTree });
  }, [navigationTree, onProjectNavigationChange]);

  return (
    <PanelProvider activeNodes={activeNodes} contentProvider={panelContentProvider}>
      <NavigationContext.Provider value={contextValue}>
        {/* Main navigation content */}
        <EuiCollapsibleNavBeta.Body data-test-subj={dataTestSubj}>
          {renderNodes(navigationTreeUI.body)}
        </EuiCollapsibleNavBeta.Body>

        {/* Footer */}
        {navigationTreeUI.footer && (
          <EuiCollapsibleNavBeta.Footer>
            {renderNodes(navigationTreeUI.footer)}
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
