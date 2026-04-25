/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, Node, Pair, Scalar } from 'yaml';
import { isDocument, isNode, isPair, isSeq } from 'yaml';

/**
 * Builds a path array from YAML visitor ancestors.
 *
 * @param ancestors - Array of ancestor nodes from the YAML visitor
 * @param targetNode - Optional target node for special handling of sequences
 * @returns Array representing the path to the node (e.g., ['steps', 0, 'type'])
 */
export function getPathFromAncestors(
  ancestors: readonly (Node | Document<Node, true> | Pair<unknown, unknown>)[],
  targetNode?: Node
): Array<string | number> {
  const path: Array<string | number> = [];

  // Skip the Document node (always the first ancestor)
  for (let i = 1; i < ancestors.length; i++) {
    const ancestor = ancestors[i];
    const nextAncestor = ancestors[i + 1];

    if (isPair(ancestor)) {
      // For Pair nodes, add the key to the path
      path.push((ancestor.key as Scalar).value as string);
    } else if (isSeq(ancestor) && nextAncestor) {
      // For Sequence nodes, find the index of the next ancestor
      const index = ancestor.items.indexOf(nextAncestor);
      if (index !== -1) {
        path.push(index);
      }
    }
  }

  // Special handling: if the last ancestor is a sequence and we have a target node,
  // we need to find which sequence item contains or matches the target
  const lastAncestor = ancestors[ancestors.length - 1];
  if (isSeq(lastAncestor) && targetNode && !isDocument(targetNode)) {
    const index = lastAncestor.items.findIndex((item) => {
      // Direct match
      if (isNode(item) && isNode(targetNode) && item === targetNode) {
        return true;
      }

      // Check if targetNode is within the range of this item
      // This handles cases where the target is the sequence item itself or a child of it
      if (isNode(item) && isNode(targetNode) && targetNode.range && item.range) {
        // Check if targetNode's start position is within the item's range
        // This is more lenient and handles cases where the target is the item itself
        return targetNode.range[0] >= item.range[0] && targetNode.range[0] <= item.range[2];
      }

      return false;
    });

    if (index !== -1) {
      path.push(index);
    }
  }

  return path;
}
