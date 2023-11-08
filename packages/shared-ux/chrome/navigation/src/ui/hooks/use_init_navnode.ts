/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type {
  AppDeepLinkId,
  ChromeNavLink,
  ChromeProjectNavigationNode,
  CloudLinkId,
  SideNavNodeStatus,
} from '@kbn/core-chrome-browser';
import { CloudLinks } from '../../cloud_links';

import { useNavigation as useNavigationServices } from '../../services';
import { getNavigationNodeId, isAbsoluteLink } from '../../utils';
import { useNavigation } from '../components/navigation';
import { NodePropsEnhanced, RegisterFunction, UnRegisterFunction } from '../types';
import { useRegisterTreeNode } from './use_register_tree_node';

/**
 * We don't have currently a way to know if a user has access to a Cloud section.
 * TODO: This function will have to be revisited once we have an API from Cloud to know the user
 * permissions.
 */
function hasUserAccessToCloudLink(): boolean {
  return true;
}

function getNodeStatus(
  {
    link,
    deepLink,
    cloudLink,
    sideNavStatus,
  }: {
    link?: string;
    deepLink?: ChromeNavLink;
    cloudLink?: CloudLinkId;
    sideNavStatus?: SideNavNodeStatus;
  },
  { cloudLinks }: { cloudLinks: CloudLinks }
): SideNavNodeStatus | 'remove' {
  if (link && !deepLink) {
    // If a link is provided, but no deepLink is found, don't render anything
    return 'remove';
  }

  if (cloudLink) {
    if (!cloudLinks[cloudLink]) {
      // Invalid cloudLinkId or link url has not been set in kibana.yml
      return 'remove';
    }
    if (!hasUserAccessToCloudLink()) return 'remove';
  }

  if (deepLink && deepLink.hidden) return 'hidden';

  return sideNavStatus ?? 'visible';
}

function getTitleForNode<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
>(
  navNode: NodePropsEnhanced<LinkId, Id, ChildrenId>,
  { deepLink, cloudLinks }: { deepLink?: ChromeNavLink; cloudLinks: CloudLinks }
): string {
  const { children } = navNode;
  if (navNode.title) {
    return navNode.title;
  }

  if (typeof children === 'string') {
    return children;
  }

  if (deepLink?.title) {
    return deepLink.title;
  }

  if (navNode.cloudLink) {
    return cloudLinks[navNode.cloudLink]?.title ?? '';
  }

  return '';
}

function validateNodeProps<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
>({
  id,
  link,
  href,
  cloudLink,
  renderAs,
  appendHorizontalRule,
  isGroup,
}: Omit<NodePropsEnhanced<LinkId, Id, ChildrenId>, 'children'>) {
  if (link && cloudLink) {
    throw new Error(
      `[Chrome navigation] Error in node [${id}]. Only one of "link" or "cloudLink" can be provided.`
    );
  }
  if (href && cloudLink) {
    throw new Error(
      `[Chrome navigation] Error in node [${id}]. Only one of "href" or "cloudLink" can be provided.`
    );
  }
  if (renderAs === 'panelOpener' && !link) {
    throw new Error(
      `[Chrome navigation] Error in node [${id}]. If renderAs is set to "panelOpener", a "link" must also be provided.`
    );
  }
  if (appendHorizontalRule && !isGroup) {
    throw new Error(
      `[Chrome navigation] Error in node [${id}]. "appendHorizontalRule" can only be added for group with children.`
    );
  }
}

function createInternalNavNode<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
>(
  id: string,
  _navNode: NodePropsEnhanced<LinkId, Id, ChildrenId>,
  deepLinks: Readonly<ChromeNavLink[]>,
  path: string[] | null,
  isActive: boolean,
  { cloudLinks }: { cloudLinks: CloudLinks }
): ChromeProjectNavigationNode | null {
  validateNodeProps(_navNode);

  const { children, link, cloudLink, ...navNode } = _navNode;
  const deepLink = deepLinks.find((dl) => dl.id === link);
  const sideNavStatus = getNodeStatus(
    {
      link,
      deepLink,
      cloudLink,
      sideNavStatus: navNode.sideNavStatus,
    },
    { cloudLinks }
  );
  const title = getTitleForNode(_navNode, { deepLink, cloudLinks });
  const href = cloudLink ? cloudLinks[cloudLink]?.href : _navNode.href;

  if (href && !isAbsoluteLink(href)) {
    throw new Error(`href must be an absolute URL. Node id [${id}].`);
  }

  if (sideNavStatus === 'remove') {
    return null;
  }

  return {
    ...navNode,
    id,
    path: path ?? [],
    title: title ?? '',
    deepLink,
    href,
    isActive,
    sideNavStatus,
  };
}

function isSamePath(pathA: string[] | null, pathB: string[] | null) {
  if (pathA === null || pathB === null) {
    return false;
  }
  const pathAToString = pathA.join('.');
  const pathBToString = pathB.join('.');
  return pathAToString === pathBToString;
}

export const useInitNavNode = <
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
>(
  node: Omit<NodePropsEnhanced<LinkId, Id, ChildrenId>, 'children'>,
  { cloudLinks }: { cloudLinks: CloudLinks }
) => {
  const { isActive: isActiveControlled } = node;

  /**
   * Map of children nodes
   */
  const [childrenNodes, setChildrenNodes] = useState<Record<string, ChromeProjectNavigationNode>>(
    {}
  );

  const isMounted = useRef(false);

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
  const [isActiveState, setIsActive] = useState(false);
  const isActive = isActiveControlled ?? isActiveState;

  const { navLinks$ } = useNavigationServices();
  const deepLinks = useObservable(navLinks$, []);
  const { register: registerNodeOnParent } = useRegisterTreeNode();
  const { activeNodes } = useNavigation();

  const id = getNavigationNodeId(node);

  const internalNavNode = useMemo(
    () => createInternalNavNode(id, node, deepLinks, nodePath, isActive, { cloudLinks }),
    [node, id, deepLinks, nodePath, isActive, cloudLinks]
  );

  // Register the node on the parent whenever its properties change or whenever
  // a child node is registered.
  const register = useCallback(() => {
    if (!internalNavNode) {
      return;
    }

    const children = Object.values(childrenNodes).sort((a, b) => {
      const aOrder = orderChildrenRef.current[a.id];
      const bOrder = orderChildrenRef.current[b.id];
      return aOrder - bOrder;
    });

    const { unregister, path } = registerNodeOnParent({
      ...internalNavNode,
      children: children.length ? children : undefined,
    });

    setNodePath((prev) => {
      if (!isSamePath(prev, path)) {
        return path;
      }
      return prev;
    });

    unregisterRef.current = unregister;
  }, [internalNavNode, childrenNodes, registerNodeOnParent]);

  // Un-register from the parent. This will happen when the node is unmounted or if the deeplink
  // is not active anymore.
  const unregister = useCallback(() => {
    if (unregisterRef.current) {
      unregisterRef.current(id);
      unregisterRef.current = undefined;
    }
  }, [id]);

  const registerChildNode = useCallback<RegisterFunction>(
    (childNode) => {
      const childPath = nodePath ? [...nodePath, childNode.id] : [];

      setChildrenNodes((prev) => {
        return {
          ...prev,
          [childNode.id]: {
            ...childNode,
            path: childPath,
          },
        };
      });

      if (orderChildrenRef.current[childNode.id] === undefined) {
        orderChildrenRef.current[childNode.id] = idx.current++;
      }

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
    [nodePath]
  );

  useEffect(() => {
    const updatedIsActive = activeNodes.reduce((acc, nodesBranch) => {
      return acc === true ? acc : nodesBranch.some((_node) => isSamePath(_node.path, nodePath));
    }, false);

    setIsActive(updatedIsActive);
  }, [activeNodes, nodePath]);

  /** Register when mounting and whenever the internal nav node changes */
  useEffect(() => {
    if (!isMounted.current) {
      return;
    }

    if (internalNavNode) {
      register();
    } else {
      unregister();
    }
  }, [unregister, register, internalNavNode]);

  /** Unregister when unmounting */
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      unregister();
    };
  }, [unregister]);

  return useMemo(
    () => ({
      navNode: internalNavNode,
      path: nodePath,
      registerChildNode,
      childrenNodes,
    }),
    [internalNavNode, registerChildNode, nodePath, childrenNodes]
  );
};
