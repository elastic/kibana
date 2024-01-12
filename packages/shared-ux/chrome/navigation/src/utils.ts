/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

export function isAbsoluteLink(link: string) {
  return link.startsWith('http://') || link.startsWith('https://');
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
