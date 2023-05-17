/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromeNavLink, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { InternalNavigationNode, RegisterFunction, UnRegisterFunction } from './types';
import { useRegisterTreeNode } from './use_register_tree_node';
import {
  getIdFromNavigationNode,
  getDeepLinkFromNavigationNode,
  getTitleForNavigationNode,
  doRenderNode,
} from './utils';

export const useInitNavnode = (
  navNode: ChromeProjectNavigationNode,
  { deepLinks }: { deepLinks: Readonly<ChromeNavLink[]> }
) => {
  const { id } = getIdFromNavigationNode(navNode);

  if (!navNode.title && !navNode.link) {
    throw new Error(`Id or link prop missing for navigation item [${id}]`);
  }

  const childrenNodes = useRef<Record<string, InternalNavigationNode>>({});
  const isRegistered = useRef(false);
  const unregisterRef = useRef<UnRegisterFunction>();

  const { register } = useRegisterTreeNode();
  const deepLink = getDeepLinkFromNavigationNode(navNode, { deepLinks });
  const { title } = getTitleForNavigationNode({ ...navNode, id }, { deepLink });

  const internalNavNode = useMemo<InternalNavigationNode>(() => {
    const node = {
      ...navNode,
      id,
      title,
      deepLink,
    };

    const isActive = doRenderNode(node);

    return {
      ...node,
      status: isActive ? 'active' : 'disabled',
    };
  }, [navNode, id, title, deepLink]);

  const isActive = internalNavNode.status === 'active';

  const unregister = useCallback(() => {
    isRegistered.current = false;
    if (unregisterRef.current) {
      unregisterRef.current();
    }
  }, []);

  const regiserGroupAndChildren = useCallback(() => {
    if (isActive) {
      const children = Object.values(childrenNodes.current);
      unregisterRef.current = register({
        ...internalNavNode,
        children: children.length ? children : undefined,
      });
      isRegistered.current = true;
    }
  }, [register, internalNavNode, isActive]);

  const registerChildren = useCallback<RegisterFunction>(
    (childNode) => {
      childrenNodes.current[childNode.id] = childNode;

      if (isRegistered.current) {
        regiserGroupAndChildren();
      }

      // Unregister function
      return () => {
        // Remove the child from this group map
        const updatedItems = { ...childrenNodes.current };
        delete updatedItems[childNode.id];
        childrenNodes.current = updatedItems;

        if (isRegistered.current) {
          // Update the parent tree
          regiserGroupAndChildren();
        }
      };
    },
    [regiserGroupAndChildren]
  );

  // When not active anymore, unregister
  useEffect(() => {
    if (isActive) {
      regiserGroupAndChildren();
    } else {
      unregister();
    }
  }, [isActive, unregister, regiserGroupAndChildren]);

  // When the component unmounts, unregister
  useEffect(() => {
    return unregister;
  }, [unregister]);

  return {
    navNode: internalNavNode,
    isActive,
    registerChildren,
  };
};
