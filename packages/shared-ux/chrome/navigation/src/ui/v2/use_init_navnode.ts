/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromeNavLink, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import {
  getIdFromNavigationNode,
  getDeepLinkFromNavigationNode,
  getTitleForNavigationNode,
} from './utils';

export const useInitNavnode = (
  navNode: ChromeProjectNavigationNode,
  { deepLinks }: { deepLinks: Readonly<ChromeNavLink[]> }
) => {
  if (deepLinks.length === 0) {
    // We don't render anything until we have at least one deep link
    return {
      id: '',
      title: '',
    };
  }
  const { id } = getIdFromNavigationNode(navNode);
  const deepLink = getDeepLinkFromNavigationNode(navNode, { deepLinks });
  const { title } = getTitleForNavigationNode({ title: navNode.title, deepLink, id });

  return {
    id,
    title,
    deepLink,
  };
};
