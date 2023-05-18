/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromeNavLink } from '@kbn/core-chrome-browser';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { useNavigation as useNavigationServices } from '../../services';
import { InternalNavigationNode, NodeProps, RegisterFunction, UnRegisterFunction } from './types';
import { useRegisterTreeNode } from './use_register_tree_node';
import {
  getIdFromNavigationNode,
  getDeepLinkFromNavigationNode,
  getTitleForNavigationNode,
  doRenderNode,
} from './utils';

function validateNode(navNode: NodeProps, id: string) {
  if (!navNode.title && !navNode.link) {
    throw new Error(`Id or link prop missing for navigation item [${id}]`);
  }
}

function createInternalNavNode(
  navNode: NodeProps,
  id: string,
  title: string,
  deepLink?: ChromeNavLink
): InternalNavigationNode {
  const { children, ...rest } = navNode;
  const node = {
    ...rest,
    id,
    title,
    deepLink,
  };

  const isActive = doRenderNode(node);

  return {
    ...node,
    status: isActive ? 'active' : 'disabled',
  };
}

export const useInitNavnode = (node: NodeProps) => {
  /**
   * Map of children nodes
   */
  const childrenNodes = useRef<Record<string, InternalNavigationNode>>({});
  /**
   * Flag to indicate if the current node has been registered
   */
  const isRegistered = useRef(false);
  /**
   * Reference to the unregister function
   */
  const unregisterRef = useRef<UnRegisterFunction>();
  /**
   * Map to keep track of the order of the children when they mount.
   * This allows us to keep in sync the nav tree sent to the Chrome service
   * with the order of the DOM elements
   */
  const orderChildrenRef = useRef<Record<string, number>>({});
  /**
   * Index to keep track of the order of the children when they mount.
   */
  const idx = useRef(0);

  const { id } = getIdFromNavigationNode(node);
  validateNode(node, id);

  const { navLinks$ } = useNavigationServices();
  const deepLinks = useObservable(navLinks$, []);

  const navNode = useMemo(() => {
    if (typeof node.children === 'string' && !node.title) {
      const updated = { ...node };
      updated.title = updated.children as string;
      return updated;
    }

    return node;
  }, [node]);

  const { register: registerNodeOnParent } = useRegisterTreeNode();
  const deepLink = getDeepLinkFromNavigationNode(navNode, { deepLinks });
  const { title } = getTitleForNavigationNode({ ...navNode, id }, { deepLink });

  const internalNavNode = useMemo(
    () => createInternalNavNode(navNode, id, title, deepLink),
    [navNode, id, title, deepLink]
  );
  const isActive = internalNavNode.status === 'active';

  const register = useCallback(() => {
    if (isActive) {
      const children = Object.values(childrenNodes.current).sort((a, b) => {
        const aOrder = orderChildrenRef.current[a.id];
        const bOrder = orderChildrenRef.current[b.id];
        return aOrder - bOrder;
      });

      unregisterRef.current = registerNodeOnParent({
        ...internalNavNode,
        children: children.length ? children : undefined,
      });

      isRegistered.current = true;
    }
  }, [internalNavNode, registerNodeOnParent, isActive]);

  const registerChildNode = useCallback<RegisterFunction>(
    (childNode) => {
      childrenNodes.current[childNode.id] = childNode;
      orderChildrenRef.current[childNode.id] = idx.current++;

      if (isRegistered.current) {
        register();
      }

      // Unregister function
      return () => {
        // Remove the child from this children map
        const updatedItems = { ...childrenNodes.current };
        delete updatedItems[childNode.id];
        childrenNodes.current = updatedItems;

        if (isRegistered.current) {
          // Update the parent tree
          register();
        }
      };
    },
    [register]
  );

  const unregister = useCallback(() => {
    isRegistered.current = false;
    if (unregisterRef.current) {
      unregisterRef.current();
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      register();
    } else {
      unregister();
    }
  }, [isActive, unregister, register]);

  useEffect(() => unregister, [unregister]);

  return useMemo(
    () => ({
      navNode: internalNavNode,
      isActive,
      registerChildNode,
    }),
    [internalNavNode, isActive, registerChildNode]
  );
};
