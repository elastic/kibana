/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser/src';
import type { Location } from 'history';

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
    isActive: true,
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
