/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromeNavLink, ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';
import { useMemo } from 'react';
import { InternalNavigationNode } from './types';
import {
  getIdFromNavigationNode,
  getDeepLinkFromNavigationNode,
  getTitleForNavigationNode,
  doRenderNode,
} from './utils';

export const useInitNavnode = (
  navNode: ChromeProjectNavigationNode,
  { deepLinks }: { deepLinks: Readonly<ChromeNavLink[]> }
): InternalNavigationNode => {
  const { id } = getIdFromNavigationNode(navNode);

  if (!navNode.title && !navNode.link) {
    throw new Error(`Id or link prop missing for navigation item [${id}]`);
  }

  const deepLink = getDeepLinkFromNavigationNode(navNode, { deepLinks });
  const { title } = getTitleForNavigationNode({ ...navNode, id }, { deepLink });

  return useMemo<InternalNavigationNode>(() => {
    const internalNavNode = {
      ...navNode,
      id,
      title,
      deepLink,
    };

    const isActive = doRenderNode(internalNavNode);

    return {
      ...internalNavNode,
      status: isActive ? 'active' : 'disabled',
    };
  }, [navNode, id, title, deepLink]);
};
