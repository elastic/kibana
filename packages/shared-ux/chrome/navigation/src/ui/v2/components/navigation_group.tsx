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
import { useNavigation } from './navigation';
import { NavigationBucket, Props as NavigationBucketProps } from './navigation_bucket';

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

export interface Props extends NodeProps {
  unstyled?: boolean;
  defaultIsCollapsed?: boolean;
}

function NavigationGroupInternalComp(props: Props) {
  const navigationContext = useNavigation();
  const { children, defaultIsCollapsed, ...node } = props;
  const { navNode, registerChildNode, path, childrenNodes } = useInitNavNode(node);

  const unstyled = props.unstyled ?? navigationContext.unstyled;

  const renderContent = useCallback(() => {
    if (!path || !navNode) {
      return null;
    }

    if (unstyled) {
      // No UI for unstyled groups
      return children;
    }

    // Each "top level" group is rendered using the EuiCollapsibleNavGroup component
    // inside the NavigationSectionUI. That's how we get the "collapsible" behavior.
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

function NavigationGroupComp(props: Props & NavigationBucketProps) {
  if (props.preset) {
    const { id, title, link, icon, children, ...rest } = props;
    return <NavigationBucket {...rest} />;
  }

  const { preset, nodeDefinition, ...rest } = props;
  return <NavigationGroupInternalComp {...rest} />;
}

export const NavigationGroup = React.memo(NavigationGroupComp) as typeof NavigationGroupComp;
