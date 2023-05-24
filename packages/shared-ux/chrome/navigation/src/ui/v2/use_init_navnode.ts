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

function getIdFromNavigationNode({ id: _id, link, title }: NodeProps): string {
  const id = _id ?? link;

  if (!id) {
    throw new Error(`Id or link prop missing for navigation item [${title}]`);
  }

  return id;
}

function createInternalNavNode(
  id: string,
  _navNode: NodeProps,
  deepLinks: Readonly<ChromeNavLink[]>
): InternalNavigationNode | null {
  const { children, onRemove, link, ...navNode } = _navNode;
  const deepLink = deepLinks.find((dl) => dl.id === link);
  const isLinkActive = isNodeActive({ link, deepLink });

  const titleFromDeepLinkOrChildren = typeof children === 'string' ? children : deepLink?.title;
  let title = navNode.title ?? titleFromDeepLinkOrChildren;

  if (!title || title.trim().length === 0) {
    if (isLinkActive) {
      throw new Error(`Title prop missing for navigation item [${id}]`);
    } else {
      // No title provided but the node is disabled, so we can safely set it to an empty string
      title = '';
    }
  }

  if (!isLinkActive) {
    return null;
  }

  return {
    ...navNode,
    id,
    title,
    deepLink,
  };
}

function isNodeActive({ link, deepLink }: { link?: string; deepLink?: ChromeNavLink }) {
  if (link && !deepLink) {
    // If a link is provided, but no deepLink is found, don't render anything
    return false;
  }
  return true;
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

  /**
   * The current node path, including all of its parents. We'll use it to match it against
   * the list of active routes based on current URL location (passed by the Chrome service)
   */
  const nodePath = useRef<string[]>([]);

  const { navLinks$ } = useNavigationServices();
  const deepLinks = useObservable(navLinks$, []);
  const { register: registerNodeOnParent } = useRegisterTreeNode();

  const id = getIdFromNavigationNode(node);

  const internalNavNode = useMemo(
    () => createInternalNavNode(id, node, deepLinks),
    [node, id, deepLinks]
  );

  const register = useCallback(() => {
    if (internalNavNode) {
      const children = Object.values(childrenNodes.current).sort((a, b) => {
        const aOrder = orderChildrenRef.current[a.id];
        const bOrder = orderChildrenRef.current[b.id];
        return aOrder - bOrder;
      });

      const { unregister, path } = registerNodeOnParent({
        ...internalNavNode,
        children: children.length ? children : undefined,
      });

      nodePath.current = [...path, internalNavNode.id];
      unregisterRef.current = unregister;
      isRegistered.current = true;
    }
  }, [internalNavNode, registerNodeOnParent]);

  const registerChildNode = useCallback<RegisterFunction>(
    (childNode) => {
      childrenNodes.current[childNode.id] = childNode;
      orderChildrenRef.current[childNode.id] = idx.current++;

      if (isRegistered.current) {
        register();
      }

      const unregisterFn = () => {
        // Remove the child from this children map
        const updatedItems = { ...childrenNodes.current };
        delete updatedItems[childNode.id];
        childrenNodes.current = updatedItems;

        if (isRegistered.current) {
          // Update the parent tree
          register();
        }
      };

      return {
        unregister: unregisterFn,
        path: [...nodePath.current],
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
    if (internalNavNode) {
      register();
    } else {
      unregister();
    }
  }, [internalNavNode, unregister, register]);

  useEffect(() => unregister, [unregister]);

  return useMemo(
    () => ({
      navNode: internalNavNode,
      registerChildNode,
    }),
    [internalNavNode, registerChildNode]
  );
};
