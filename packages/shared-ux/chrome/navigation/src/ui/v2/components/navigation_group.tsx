/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useCallback, useMemo, useContext } from 'react';

import { useInitNavNode } from '../use_init_navnode';
import type { NodeProps, RegisterFunction } from '../types';
import { NavigationSectionUI } from './navigation_section_ui';

interface Context {
  register: RegisterFunction;
}

export const NavigationGroupContext = createContext<Context | undefined>(undefined);

export function useNavigationGroup<T extends boolean = true>(
  throwIfNotFound: T = true as T
): T extends true ? Context : Context | undefined {
  const context = useContext(NavigationGroupContext);
  if (!context && throwIfNotFound) {
    throw new Error('useNavigationGroup must be used within a NavigationGroup provider');
  }
  return context as T extends true ? Context : Context | undefined;
}

interface Props extends NodeProps {
  unstyled?: boolean;
  defaultIsCollapsed?: boolean;
}

function NavigationGroupComp(props: Props) {
  const { children, defaultIsCollapsed, unstyled = false, ...node } = props;
  const { navNode, registerChildNode, path, childrenNodes } = useInitNavNode(node);

  const renderContent = useCallback(() => {
    if (!path || !navNode) {
      return null;
    }

    if (unstyled) {
      // No UI for unstyled groups
      return children;
    }

    const isTopLevel = path && path.length === 1;

    return (
      <>
        {isTopLevel && (
          <NavigationSectionUI
            navNode={navNode}
            items={Object.values(childrenNodes)}
            defaultIsCollapsed={defaultIsCollapsed}
          />
        )}
        {children}
      </>
    );
  }, [navNode, path, childrenNodes, children, defaultIsCollapsed, unstyled]);

  const contextValue = useMemo(() => {
    return {
      register: registerChildNode,
    };
  }, [registerChildNode]);

  if (!navNode) {
    return null;
  }

  return (
    <NavigationGroupContext.Provider value={contextValue}>
      {renderContent()}
    </NavigationGroupContext.Provider>
  );
}

export const NavigationGroup = React.memo(NavigationGroupComp);
