/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVTOOL_HIDDEN_ATTR, SVG_INTERNALS } from '../constants';
import { resolveTag } from '../fiber';

export interface TreeNode {
  tag: string;
  depth: number;
  element: Element;
  hasChildren: boolean;
  isClosing?: boolean;
}

const MAX_DEPTH = 50;

export const flattenElementTree = (el: Element, depth: number): TreeNode[] => {
  if (depth > MAX_DEPTH) return [];

  // Skip elements hidden by the edit overlay (soft-deleted) and all their children.
  if (el.hasAttribute(DEVTOOL_HIDDEN_ATTR)) return [];

  const tag = resolveTag(el);
  const children = Array.from(el.children);
  const nodes: TreeNode[] = [];

  // Treat SVG containers as leaf nodes — don't recurse into path/g/circle etc.
  const isSvg = el.tagName.toLowerCase() === 'svg';
  const isSvgInternal = SVG_INTERNALS.has(el.tagName.toLowerCase());

  if (isSvgInternal) {
    return nodes;
  }

  if (children.length === 0 || isSvg) {
    nodes.push({ tag, depth, element: el, hasChildren: false });
    return nodes;
  }

  const childNodes: TreeNode[] = [];
  for (const child of children) {
    childNodes.push(...flattenElementTree(child, depth + 1));
  }

  // If all children were filtered out (e.g. hidden), render as self-closing.
  if (childNodes.length === 0) {
    nodes.push({ tag, depth, element: el, hasChildren: false });
    return nodes;
  }

  nodes.push({ tag, depth, element: el, hasChildren: true });
  nodes.push(...childNodes);
  nodes.push({ tag, depth, element: el, hasChildren: true, isClosing: true });
  return nodes;
};
