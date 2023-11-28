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
} from '@kbn/core-chrome-browser';

import type { CloudLinks } from './cloud_links';
import type { NodeProps } from './ui/types';
import { getNavigationNodeHref, getNavigationNodeId, isAbsoluteLink } from './utils';

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
  navNode: NodeProps<LinkId, Id, ChildrenId>,
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
>({ id, link, href, cloudLink, renderAs }: NodeProps<LinkId, Id, ChildrenId>) {
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
  node: NodeProps<LinkId, Id, ChildrenId>,
  { cloudLinks, deepLinks }: { cloudLinks: CloudLinks; deepLinks: Record<string, ChromeNavLink> }
): ChromeProjectNavigationNode | null => {
  validateNodeProps(node);

  const {
    cloudLink,
    link,
    parentNodePath,
    rootIndex = 0,
    treeDepth = 0,
    index = 0,
    children,
    ...navNodeFromProps
  } = node;
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

  const id = getNavigationNodeId(node, () => `node-${rootIndex}-${treeDepth}-${index}`) as Id;
  const title = getTitleForNode(node, { deepLink, cloudLinks });
  const href = cloudLink ? cloudLinks[cloudLink]?.href : node.href;
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
    sideNavStatus,
  };

  return navNode;
};
