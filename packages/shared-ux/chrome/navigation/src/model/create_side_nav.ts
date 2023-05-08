/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ChromeNavigationNodeViewModel, PlatformSectionConfig } from '../../types';

/**
 * Navigation node parser. It filers out the nodes disabled through config and
 * sets the `path` of each of the nodes.
 *
 * @param navItems Navigation nodes
 * @param platformSectionConfig Configuration with flags to disable nodes in the navigation tree
 *
 * @returns The navigation tree filtered
 */
export const parseNavItems = (
  parentIds: string[] = [],
  navItems?: ChromeNavigationNodeViewModel[],
  platformSectionConfig?: PlatformSectionConfig
): ChromeNavigationNodeViewModel[] | undefined => {
  if (!navItems) {
    return undefined;
  }

  return navItems.reduce<ChromeNavigationNodeViewModel[]>((accum, item) => {
    const config = platformSectionConfig?.properties?.[item.id];
    if (config?.enabled === false) {
      // return accumulated set without the item that is not enabled
      return accum;
    }

    const path = [...parentIds, item.id].filter(Boolean).join('.');

    let filteredItems: ChromeNavigationNodeViewModel[] | undefined;
    if (item.items) {
      // recursion
      const nextPlatformSectionConfig = platformSectionConfig?.properties?.[item.id];
      filteredItems = parseNavItems([...parentIds, item.id], item.items, nextPlatformSectionConfig);
    }

    return [...accum, { ...item, path, items: filteredItems }];
  }, []);
};
