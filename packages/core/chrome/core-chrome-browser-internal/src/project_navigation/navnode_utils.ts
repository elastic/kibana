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
  CloudLinks,
  CloudLink,
  NavigationTreeDefinition,
  CloudUrls,
  RootNavigationItemDefinition,
  PresetDefinition,
  GroupDefinition,
  ItemDefinition,
  RecentlyAccessedDefinition,
} from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';

let uniqueId = 0;

export function generateUniqueNodeId() {
  const id = `node${uniqueId++}`;
  return id;
}

export function isAbsoluteLink(link: string) {
  return link.startsWith('http://') || link.startsWith('https://');
}

export function isGroupNode({ children }: Pick<ChromeProjectNavigationNode, 'children'>) {
  return children !== undefined;
}

export function isItemNode({ children }: Pick<ChromeProjectNavigationNode, 'children'>) {
  return children === undefined;
}

export function getNavigationNodeId(
  { id: _id, link }: Pick<NodeDefinition, 'id' | 'link'>,
  idGenerator = generateUniqueNodeId
): string {
  const id = _id ?? link;
  return id ?? idGenerator();
}

export function getNavigationNodeHref({
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

export const initNavNode = <
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

const stripTrailingForwardSlash = (str: string) => {
  return str[str.length - 1] === '/' ? str.substring(0, str.length - 1) : str;
};

const parseCloudURLs = (cloudLinks: CloudLinks): CloudLinks => {
  const { userAndRoles, billingAndSub, deployment, performance } = cloudLinks;

  // We remove potential trailing forward slash ("/") at the end of the URL
  // because it breaks future navigation in Cloud console once we navigate there.
  const parseLink = (link?: CloudLink): CloudLink | undefined => {
    if (!link) return undefined;
    return { ...link, href: stripTrailingForwardSlash(link.href) };
  };

  return {
    ...cloudLinks,
    userAndRoles: parseLink(userAndRoles),
    billingAndSub: parseLink(billingAndSub),
    deployment: parseLink(deployment),
    performance: parseLink(performance),
  };
};

const getCloudLinks = (
  cloud: {
    billingUrl?: string;
    deploymentUrl?: string;
    performanceUrl?: string;
    usersAndRolesUrl?: string;
  } = {}
): CloudLinks => {
  const { billingUrl, deploymentUrl, performanceUrl, usersAndRolesUrl } = cloud;

  const links: CloudLinks = {};

  if (usersAndRolesUrl) {
    links.userAndRoles = {
      title: i18n.translate(
        'sharedUXPackages.chrome.sideNavigation.cloudLinks.usersAndRolesLinkText',
        {
          defaultMessage: 'Users and roles',
        }
      ),
      href: usersAndRolesUrl,
    };
  }

  if (performanceUrl) {
    links.performance = {
      title: i18n.translate(
        'sharedUXPackages.chrome.sideNavigation.cloudLinks.performanceLinkText', // TODO change i18n prefix
        {
          defaultMessage: 'Performance',
        }
      ),
      href: performanceUrl,
    };
  }

  if (billingUrl) {
    links.billingAndSub = {
      title: i18n.translate('sharedUXPackages.chrome.sideNavigation.cloudLinks.billingLinkText', {
        defaultMessage: 'Billing and subscription',
      }),
      href: billingUrl,
    };
  }

  if (deploymentUrl) {
    links.deployment = {
      title: i18n.translate(
        'sharedUXPackages.chrome.sideNavigation.cloudLinks.deploymentLinkText',
        {
          defaultMessage: 'Project',
        }
      ),
      href: deploymentUrl,
    };
  }

  return links;
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
  { deepLinks, cloudUrls }: { deepLinks: Readonly<ChromeNavLink[]>; cloudUrls?: CloudUrls }
): ChromeProjectNavigationNode[] => {
  const cloudLinks = parseCloudURLs(getCloudLinks(cloudUrls));

  const deepLinksToMap = deepLinks.reduce((acc, navLink) => {
    acc[navLink.id] = navLink;
    return acc;
  }, {} as Record<string, ChromeNavLink>);

  const navigationTree: ChromeProjectNavigationNode[] = [];

  const initNodeAndChildren = (
    node: GroupDefinition | ItemDefinition | NodeDefinition,
    { index = 0, parentPath = [] }: { index?: number; parentPath?: string[] } = {}
  ): ChromeProjectNavigationNode | null => {
    const navNode = initNavNode(node, {
      cloudLinks,
      deepLinks: deepLinksToMap,
      parentNodePath: parentPath.length > 0 ? parentPath.join('.') : undefined,
      index,
    });

    if (navNode) {
      if (isGroupDefinition(node) && node.children) {
        navNode.children = node.children
          .map((child, i) =>
            initNodeAndChildren(child, {
              index: i,
              parentPath: [...parentPath, navNode.id],
            })
          )
          .filter((child): child is ChromeProjectNavigationNode => child !== null);
      }
    }
    return navNode;
  };

  const onNodeInitiated = (navNode: ChromeProjectNavigationNode | null) => {
    if (navNode) {
      navigationTree.push(navNode);
    }
  };

  const parseNodesArray = (nodes?: RootNavigationItemDefinition[]): void => {
    if (!nodes) return;

    nodes.forEach((node) => {
      if (isPresetDefinition(node) || isRecentlyAccessedDefinition(node)) return;

      const navNode = initNodeAndChildren(node);

      onNodeInitiated(navNode);
    });
  };

  parseNodesArray(navigationTreeDef.body);
  parseNodesArray(navigationTreeDef.footer);

  return navigationTree;
};
