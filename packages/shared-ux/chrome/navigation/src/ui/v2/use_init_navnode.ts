/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromeNavLink, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';

import { useNavigation as useNavigationServices } from '../../services';
import { NodeProps, RegisterFunction, UnRegisterFunction } from './types';
import { useRegisterTreeNode } from './use_register_tree_node';

/**
 * @private
 *
 * Internally we enhance the Props passed to the Navigation.Item component.
 */
interface NodePropsEnhanced extends NodeProps {
  /**
   * This function correspond to the same "itemRender" function that can be passed to
   * the EuiSideNavItemType (see navigation_section_ui.tsx)
   */
  itemRender?: () => ReactElement;
}

function getIdFromNavigationNode({ id: _id, link, title }: NodeProps): string {
  const id = _id ?? link;

  if (!id) {
    throw new Error(`Id or link prop missing for navigation item [${title}]`);
  }

  return id;
}

function isNodeVisible({ link, deepLink }: { link?: string; deepLink?: ChromeNavLink }) {
  if (link && !deepLink) {
    // If a link is provided, but no deepLink is found, don't render anything
    return false;
  }
  return true;
}

function createInternalNavNode(
  id: string,
  _navNode: NodePropsEnhanced,
  deepLinks: Readonly<ChromeNavLink[]>,
  path: string[] | null
): ChromeProjectNavigationNode | null {
  const { children, link, ...navNode } = _navNode;
  const deepLink = deepLinks.find((dl) => dl.id === link);
  const isVisible = isNodeVisible({ link, deepLink });

  const titleFromDeepLinkOrChildren = typeof children === 'string' ? children : deepLink?.title;
  const title = navNode.title ?? titleFromDeepLinkOrChildren;

  if (!isVisible) {
    return null;
  }

  return {
    ...navNode,
    id,
    path: path ?? [id],
    title: title ?? '',
    deepLink,
  };
}

export const useInitNavNode = (node: NodePropsEnhanced) => {
  /**
   * Map of children nodes
   */
  const [childrenNodes, setChildrenNodes] = useState<Record<string, ChromeProjectNavigationNode>>(
    {}
  );

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
  const orderChildrenRef = useRef<Record<ChromeProjectNavigationNode['id'], number>>({});
  /**
   * Index to keep track of the order of the children when they mount.
   */
  const idx = useRef(0);

  /**
   * The current node path, including all of its parents. We'll use it to match it against
   * the list of active routes based on current URL location (passed by the Chrome service)
   */
  const [nodePath, setNodePath] = useState<string[] | null>(null);

  /**
   * Whenever a child node is registered, we need to re-register the current node
   * on the parent. This state keeps track when child node register.
   */
  const [childrenNodesUpdated, setChildrenNodesUpdated] = useState<string[]>([]);

  /**
   * Create a stable string reference of the node path to avoid infinite loops
   */
  const nodePathToString = nodePath ? nodePath.join('.') : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableNodePath = useMemo(() => nodePath, [nodePathToString]);

  const { navLinks$ } = useNavigationServices();
  const deepLinks = useObservable(navLinks$, []);
  const { register: registerNodeOnParent } = useRegisterTreeNode();

  const id = getIdFromNavigationNode(node);

  const internalNavNode = useMemo(
    () => createInternalNavNode(id, node, deepLinks, stableNodePath),
    [node, id, deepLinks, stableNodePath]
  );

  // Register the node on the parent whenever its properties change or whenever
  // a child node is registered.
  const register = useCallback(() => {
    if (!internalNavNode) {
      return;
    }

    if (!isRegistered.current || childrenNodesUpdated.length > 0) {
      const children = Object.values(childrenNodes).sort((a, b) => {
        const aOrder = orderChildrenRef.current[a.id];
        const bOrder = orderChildrenRef.current[b.id];
        return aOrder - bOrder;
      });

      const { unregister, path } = registerNodeOnParent({
        ...internalNavNode,
        children: children.length ? children : undefined,
      });

      setNodePath(path);
      setChildrenNodesUpdated([]);

      unregisterRef.current = unregister;
      isRegistered.current = true;
    }
  }, [internalNavNode, childrenNodesUpdated.length, childrenNodes, registerNodeOnParent]);

  // Un-register from the parent. This will happen when the node is unmounted or if the deeplink
  // is not active anymore.
  const unregister = useCallback(() => {
    isRegistered.current = false;
    if (unregisterRef.current) {
      unregisterRef.current(id);
      unregisterRef.current = undefined;
    }
  }, [id]);

  const registerChildNode = useCallback<RegisterFunction>(
    (childNode) => {
      const childPath = stableNodePath ? [...stableNodePath, childNode.id] : [];

      setChildrenNodes((prev) => {
        return {
          ...prev,
          [childNode.id]: {
            ...childNode,
            path: childPath,
          },
        };
      });

      orderChildrenRef.current[childNode.id] = idx.current++;
      setChildrenNodesUpdated((prev) => [...prev, childNode.id]);

      return {
        unregister: (childId: string) => {
          setChildrenNodes((prev) => {
            const updatedItems = { ...prev };
            delete updatedItems[childId];
            return updatedItems;
          });
        },
        path: childPath,
      };
    },
    [stableNodePath]
  );

  /** Register when mounting and whenever the internal nav node changes */
  useEffect(() => {
    if (internalNavNode) {
      register();
    } else {
      unregister();
    }
  }, [unregister, register, internalNavNode]);

  /** Unregister when unmounting */
  useEffect(() => unregister, [unregister]);

  return useMemo(
    () => ({
      navNode: internalNavNode,
      path: stableNodePath,
      registerChildNode,
      childrenNodes,
    }),
    [internalNavNode, registerChildNode, stableNodePath, childrenNodes]
  );
};
