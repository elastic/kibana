/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useCallback, useMemo, useContext } from 'react';
import type { AppDeepLinkId } from '@kbn/core-chrome-browser';

import { useNavigation as useNavigationServices } from '../../services';
import { useInitNavNode } from '../hooks';
import type { NodeProps, RegisterFunction } from '../types';
import { NavigationSectionUI } from './navigation_section_ui';
import { useNavigation } from './navigation';
import { NavigationBucket, type Props as NavigationBucketProps } from './navigation_bucket';

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

export interface Props<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
> extends NodeProps<LinkId, Id, ChildrenId> {
  unstyled?: boolean;
  defaultIsCollapsed?: boolean;
}

function NavigationGroupInternalComp<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
>(props: Props<LinkId, Id, ChildrenId>) {
  const { cloudLinks } = useNavigationServices();
  const navigationContext = useNavigation();

  const { children, node } = useMemo(() => {
    const { children: _children, defaultIsCollapsed, ...rest } = props;
    return {
      children: _children,
      node: {
        ...rest,
        isActive: defaultIsCollapsed !== undefined ? defaultIsCollapsed === false : undefined,
      },
    };
  }, [props]);

  const { navNode, registerChildNode, path, childrenNodes } = useInitNavNode(node, { cloudLinks });

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
          <NavigationSectionUI navNode={navNode} items={Object.values(childrenNodes)} />
        )}
        {/* We render the children so they mount and can register themselves but
        visually they don't appear here in the DOM. They are rendered inside the
        <EuiSideNav />  "items" prop (see <NavigationSectionUI />) */}
        {children}
      </>
    );
  }, [navNode, path, childrenNodes, children, unstyled]);

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

function NavigationGroupComp<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
>(props: Props<LinkId, Id, ChildrenId> & NavigationBucketProps) {
  if (props.preset) {
    return (
      <NavigationBucket
        preset={props.preset}
        nodeDefinition={props.nodeDefinition}
        defaultIsCollapsed={props.defaultIsCollapsed}
      />
    );
  }

  const { preset, nodeDefinition, ...rest } = props;
  return <NavigationGroupInternalComp {...rest} />;
}

export const NavigationGroup = React.memo(NavigationGroupComp) as typeof NavigationGroupComp;
