/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  AppDeepLinkId,
  ChromeNavLink,
  ChromeProjectNavigationNode,
  CloudLinkId,
  SideNavNodeStatus,
  NodeDefinition,
  NavigationTreeDefinition,
  RootNavigationItemDefinition,
  PresetDefinition,
  GroupDefinition,
  ItemDefinition,
  RecentlyAccessedDefinition,
} from '@kbn/core-chrome-browser';
import type { CloudLinks } from './cloud_links';
import { getPresets } from './ui';

let uniqueId = 0;

function generateUniqueNodeId() {
  const id = `node${uniqueId++}`;
  return id;
}

export function isAbsoluteLink(link: string) {
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

function isSamePath(pathA: string | null, pathB: string | null) {
  if (pathA === null || pathB === null) {
    return false;
  }
  return pathA === pathB;
}

export function isActiveFromUrl(nodePath: string, activeNodes: ChromeProjectNavigationNode[][]) {
  return activeNodes.reduce((acc, nodesBranch) => {
    return acc === true ? acc : nodesBranch.some((branch) => isSamePath(branch.path, nodePath));
  }, false);
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
>({ id, link, href, cloudLink, renderAs }: NodeDefinition<LinkId, Id, ChildrenId>) {
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
  if (renderAs === 'item' && !link) {
    throw new Error(
      `[Chrome navigation] Error in node [${id}]. If renderAs is set to "item", a "link" must also be provided.`
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

  const { cloudLink, link, children, ...navNodeFromProps } = node;
  const deepLink = link !== undefined ? deepLinks[link] : undefined;
  const sideNavStatus = getNodeStatus(
    {
      link,
      deepLink,
      cloudLink,
      sideNavStatus: navNodeFromProps.sideNavStatus,
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

  if (href && !isAbsoluteLink(href)) {
    throw new Error(`href must be an absolute URL. Node id [${id}].`);
  }

  const navNode: ChromeProjectNavigationNode = {
    ...navNodeFromProps,
    id,
    href: getNavigationNodeHref({ href, deepLink }),
    path,
    title,
    deepLink,
    isElasticInternalLink,
    sideNavStatus,
  };

  return navNode;
};

const navTreePresets = getPresets('all');

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

export interface NavigationTreeUI {
  body: Array<ChromeProjectNavigationNode | RecentlyAccessedDefinition>;
  footer?: Array<ChromeProjectNavigationNode | RecentlyAccessedDefinition>;
}

export const parseNavigationTree = (
  navigationTreeDef: NavigationTreeDefinition,
  { deepLinks, cloudLinks }: { deepLinks: Record<string, ChromeNavLink>; cloudLinks: CloudLinks }
): { navigationTree: ChromeProjectNavigationNode[]; navigationTreeUI: NavigationTreeUI } => {
  // The navigation tree that represents the global navigation and will be used by the Chrome service
  const navigationTree: ChromeProjectNavigationNode[] = [];

  // Contains UI layout information (body, footer) and render "special" blocks like recently accessed.
  const navigationTreeUI: NavigationTreeUI = { body: [] };

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
    section: 'body' | 'footer' = 'body'
  ): void => {
    if (!nodes) return;

    nodes.forEach((node) => {
      const navNode = initNodeAndChildren(node);
      onNodeInitiated(navNode, section);
    });
  };

  parseNodesArray(navigationTreeDef.body, 'body');
  parseNodesArray(navigationTreeDef.footer, 'footer');

  return { navigationTree, navigationTreeUI };
};
