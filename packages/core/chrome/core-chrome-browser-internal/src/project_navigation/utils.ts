/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ChromeNavLink,
  ChromeProjectNavigationNode,
  NavigationTreeDefinition,
  NodeDefinition,
  RecentlyAccessedDefinition,
  RootNavigationItemDefinition,
  NavigationTreeDefinitionUI,
  PresetDefinition,
  GroupDefinition,
  AppDeepLinkId,
  SideNavNodeStatus,
  CloudLinkId,
  CloudLinks,
  ItemDefinition,
} from '@kbn/core-chrome-browser/src';
import type { Location } from 'history';
import type { MouseEventHandler } from 'react';
import { getPresets } from './navigation_presets';

const wrapIdx = (index: number): string => `[${index}]`;

/**
 * Flatten the navigation tree into a record of path => node
 * for quicker access when detecting the active path
 *
 * @param navTree The navigation tree to flatten
 * @param prefix Array of path prefix (used in the recursion)
 * @returns The flattened navigation tree
 */
export const flattenNav = (
  navTree: ChromeProjectNavigationNode[],
  prefix: string[] = []
): Record<string, ChromeProjectNavigationNode> => {
  return navTree.reduce<Record<string, ChromeProjectNavigationNode>>((acc, node, idx) => {
    const updatedPrefix = [...prefix, `${wrapIdx(idx)}`];
    const nodePath = () => updatedPrefix.join('');

    if (node.children && node.children.length > 0) {
      const { children, ...rest } = node;
      return {
        ...acc,
        [nodePath()]: rest,
        ...flattenNav(children, updatedPrefix),
      };
    }

    acc[nodePath()] = node;

    return acc;
  }, {});
};

function trim(str: string) {
  return (divider: string) => {
    const position = str.indexOf(divider);

    if (position !== -1) {
      str = str.slice(0, position);
    }

    return str;
  };
}

export const stripQueryParams = (url: string) => trim(url)('?');

function serializeDeeplinkUrl(url?: string) {
  if (!url) {
    return undefined;
  }
  return stripQueryParams(url);
}

/**
 * Extract the parent paths from a key
 *
 * @example
 * IN: "[0][1][2][0]"
 * OUT: ["[0]", "[0][1]", "[0][1][2]", "[0][1][2][0]"]
 *
 * @param key The key to extract parent paths from
 * @returns An array of parent paths
 */
function extractParentPaths(key: string, navTree: Record<string, ChromeProjectNavigationNode>) {
  // Split the string on every '][' to get an array of values without the brackets.
  const arr = key.split('][');
  if (arr.length === 1) {
    return arr;
  }
  // Add the brackets back in for the first and last elements, and all elements in between.
  arr[0] = `${arr[0]}]`;
  arr[arr.length - 1] = `[${arr[arr.length - 1]}`;
  for (let i = 1; i < arr.length - 1; i++) {
    arr[i] = `[${arr[i]}]`;
  }

  return arr
    .reduce<string[]>((acc, currentValue, currentIndex) => {
      acc.push(arr.slice(0, currentIndex + 1).join(''));
      return acc;
    }, [])
    .filter((k) => Boolean(navTree[k]));
}

/**
 * Find the active nodes in the navigation tree based on the current Location.pathname
 * Note that the pathname cand match multiple navigation tree branches, each branch
 * will be returned as an array of nodes.
 *
 * @param currentPathname The current Location.pathname
 * @param navTree The flattened navigation tree
 * @returns The active nodes
 */
export const findActiveNodes = (
  currentPathname: string,
  navTree: Record<string, ChromeProjectNavigationNode>,
  location?: Location,
  prepend: (path: string) => string = (path) => path
): ChromeProjectNavigationNode[][] => {
  const activeNodes: ChromeProjectNavigationNode[][] = [];
  const matches: string[][] = [];

  const activeNodeFromKey = (key: string): ChromeProjectNavigationNode => ({
    ...navTree[key],
  });

  Object.entries(navTree).forEach(([key, node]) => {
    if (node.getIsActive && location) {
      const isActive = node.getIsActive({ pathNameSerialized: currentPathname, location, prepend });
      if (isActive) {
        const keysWithParents = extractParentPaths(key, navTree);
        activeNodes.push(keysWithParents.map(activeNodeFromKey));
      }
      return;
    }

    const nodePath = serializeDeeplinkUrl(node.deepLink?.url);

    if (nodePath) {
      const match = currentPathname.startsWith(nodePath);

      if (match) {
        const { length } = nodePath;
        if (!matches[length]) {
          matches[length] = [];
        }
        matches[length].push(key);
        // If there are multiple node matches of the same URL path length, we want to order them by
        // tree depth, so that the longest match (deepest node) comes first.
        matches[length].sort((a, b) => b.length - a.length);
      }
    }
  });

  if (matches.length > 0) {
    const longestMatch = matches[matches.length - 1];
    longestMatch.forEach((key) => {
      const keysWithParents = extractParentPaths(key, navTree);
      activeNodes.push(keysWithParents.map(activeNodeFromKey));
    });
  }

  return activeNodes;
};

let uniqueId = 0;

function generateUniqueNodeId() {
  const id = `node${uniqueId++}`;
  return id;
}

function isAbsoluteLink(link: string) {
  return link.startsWith('http://') || link.startsWith('https://');
}

function getNavigationNodeId(
  { id: _id, link }: Pick<NodeDefinition, 'id' | 'link'>,
  idGenerator = generateUniqueNodeId
): string {
  const id = _id ?? link;
  return id ?? idGenerator();
}

function getNavigationNodeHref({
  href,
  deepLink,
}: Pick<ChromeProjectNavigationNode, 'href' | 'deepLink'>): string | undefined {
  return deepLink?.url ?? href;
}

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
    onClick,
  }: {
    link?: string;
    deepLink?: ChromeNavLink;
    cloudLink?: CloudLinkId;
    sideNavStatus?: SideNavNodeStatus;
    onClick?: MouseEventHandler<HTMLButtonElement | HTMLElement>;
  },
  { cloudLinks }: { cloudLinks: CloudLinks }
): SideNavNodeStatus | 'remove' {
  if (link && !deepLink && !onClick) {
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

  return sideNavStatus ?? 'visible';
}

function getTitleForNode(
  navNode: { title?: string; deepLink?: { title: string }; cloudLink?: CloudLinkId },
  { deepLink, cloudLinks }: { deepLink?: ChromeNavLink; cloudLinks: CloudLinks }
): string {
  if (navNode.title) {
    return navNode.title;
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
>({ id, link, href, cloudLink, renderAs, onClick }: NodeDefinition<LinkId, Id, ChildrenId>) {
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
  if (renderAs === 'item' && !link && !onClick) {
    throw new Error(
      `[Chrome navigation] Error in node [${id}]. If renderAs is set to "item", a "link" or "onClick" must also be provided.`
    );
  }
}

const initNavNode = <
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
>(
  node: NodeDefinition<LinkId, Id, ChildrenId>,
  {
    cloudLinks,
    deepLinks,
    parentNodePath,
    index = 0,
  }: {
    cloudLinks: CloudLinks;
    deepLinks: Record<string, ChromeNavLink>;
    parentNodePath?: string;
    index?: number;
  }
): ChromeProjectNavigationNode | null => {
  validateNodeProps(node);

  const { cloudLink, link, children, onClick, ...navNodeFromProps } = node;
  const deepLink = link !== undefined ? deepLinks[link] : undefined;
  const sideNavStatus = getNodeStatus(
    {
      link,
      deepLink,
      cloudLink,
      sideNavStatus: navNodeFromProps.sideNavStatus,
      onClick,
    },
    { cloudLinks }
  );

  if (sideNavStatus === 'remove') {
    return null;
  }

  const id = getNavigationNodeId(node, () => `node-${index}`) as Id;
  const title = getTitleForNode(node, { deepLink, cloudLinks });
  const isElasticInternalLink = cloudLink != null;
  const href = isElasticInternalLink ? cloudLinks[cloudLink]?.href : node.href;
  const path = parentNodePath ? `${parentNodePath}.${id}` : id;

  if (href && !isAbsoluteLink(href) && !onClick) {
    throw new Error(`href must be an absolute URL. Node id [${id}].`);
  }

  const navNode: ChromeProjectNavigationNode = {
    ...navNodeFromProps,
    id,
    href: getNavigationNodeHref({ href, deepLink }),
    onClick,
    path,
    title,
    deepLink,
    isElasticInternalLink,
    sideNavStatus,
  };

  return navNode;
};

const isPresetDefinition = (
  item: RootNavigationItemDefinition | NodeDefinition
): item is PresetDefinition => {
  return (item as PresetDefinition).preset !== undefined;
};

const isGroupDefinition = (
  item: RootNavigationItemDefinition | NodeDefinition
): item is GroupDefinition => {
  return (
    (item as GroupDefinition).type === 'navGroup' || (item as NodeDefinition).children !== undefined
  );
};

const isRecentlyAccessedDefinition = (
  item: RootNavigationItemDefinition | NodeDefinition
): item is RecentlyAccessedDefinition => {
  return (item as RootNavigationItemDefinition).type === 'recentlyAccessed';
};

export const parseNavigationTree = (
  navigationTreeDef: NavigationTreeDefinition,
  { deepLinks, cloudLinks }: { deepLinks: Record<string, ChromeNavLink>; cloudLinks: CloudLinks }
): {
  navigationTree: ChromeProjectNavigationNode[];
  navigationTreeUI: NavigationTreeDefinitionUI;
} => {
  const navTreePresets = getPresets('all');

  // The navigation tree that represents the global navigation and will be used by the Chrome service
  const navigationTree: ChromeProjectNavigationNode[] = [];

  // Contains UI layout information (body, footer) and render "special" blocks like recently accessed.
  const navigationTreeUI: NavigationTreeDefinitionUI = { body: [] };

  const initNodeAndChildren = (
    node: GroupDefinition | ItemDefinition | NodeDefinition,
    { index = 0, parentPath = [] }: { index?: number; parentPath?: string[] } = {}
  ): ChromeProjectNavigationNode | RecentlyAccessedDefinition | null => {
    if (isRecentlyAccessedDefinition(node)) {
      return node;
    }

    let nodeSerialized: NodeDefinition | GroupDefinition | ItemDefinition = node;

    if (isPresetDefinition(node)) {
      // Get the navGroup definition from the preset
      const { preset, type, ...rest } = node;
      nodeSerialized = { ...navTreePresets[preset], type: 'navGroup', ...rest };
    }

    const navNode = initNavNode(nodeSerialized, {
      cloudLinks,
      deepLinks,
      parentNodePath: parentPath.length > 0 ? parentPath.join('.') : undefined,
      index,
    });

    if (navNode && isGroupDefinition(nodeSerialized) && nodeSerialized.children) {
      navNode.children = nodeSerialized.children
        .map((child, i) =>
          initNodeAndChildren(child, {
            index: i,
            parentPath: [...parentPath, navNode.id],
          })
        )
        .filter((child): child is ChromeProjectNavigationNode => child !== null);
    }

    return navNode;
  };

  const onNodeInitiated = (
    navNode: ChromeProjectNavigationNode | RecentlyAccessedDefinition | null,
    section: 'body' | 'footer' = 'body'
  ) => {
    if (navNode) {
      if (!isRecentlyAccessedDefinition(navNode)) {
        // Add the node to the global navigation tree
        navigationTree.push(navNode);
      }

      // Add the node to the Side Navigation UI tree
      if (!navigationTreeUI[section]) {
        navigationTreeUI[section] = [];
      }
      navigationTreeUI[section]!.push(navNode);
    }
  };

  const parseNodesArray = (
    nodes?: RootNavigationItemDefinition[],
    section: 'body' | 'footer' = 'body',
    startIndex = 0
  ): void => {
    if (!nodes) return;

    nodes.forEach((node, i) => {
      const navNode = initNodeAndChildren(node, { index: startIndex + i });
      onNodeInitiated(navNode, section);
    });
  };

  parseNodesArray(navigationTreeDef.body, 'body');
  parseNodesArray(navigationTreeDef.footer, 'footer', navigationTreeDef.body?.length ?? 0);

  return { navigationTree, navigationTreeUI };
};
