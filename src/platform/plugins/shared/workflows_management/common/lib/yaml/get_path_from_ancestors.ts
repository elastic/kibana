/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Document, Node, Pair, Scalar } from 'yaml';
import { isPair, isSeq } from 'yaml';

export function getPathFromAncestors(
  ancestors: readonly (Node | Document<Node, true> | Pair<unknown, unknown>)[],
  targetNode?: Node
) {
  const path: Array<string | number> = [];

  // Create a new array to store path components
  for (let index = 0; index < ancestors.length; index++) {
    const ancestor = ancestors[index];

    if (isPair(ancestor)) {
      path.push((ancestor.key as Scalar).value as string);
    } else if (isSeq(ancestor)) {
      // If ancestor is a Sequence, we need to find the index of the child item
      let childNode: any = null;

      // Look for the next ancestor that would be contained within this sequence
      for (let i = index + 1; i < ancestors.length; i++) {
        const nextAncestor = ancestors[i];
        if (!isSeq(nextAncestor)) {
          childNode = nextAncestor;
          break;
        }
      }

      // Special case: if this is the last sequence in the ancestors chain,
      // and we have a target node, find which sequence item contains the target
      if (!childNode && index === ancestors.length - 1 && targetNode) {
        const seqIndex = ancestor.items.findIndex((item) => {
          // Check if this sequence item contains our target node
          if (item === targetNode) return true;

          // Check if the target node is contained within this sequence item
          // Avoid using 'in' operator on possibly primitive values
          const itemHasRange =
            typeof item === 'object' &&
            item !== null &&
            Object.prototype.hasOwnProperty.call(item, 'range');
          const targetNodeHasRange =
            typeof targetNode === 'object' &&
            targetNode !== null &&
            Object.prototype.hasOwnProperty.call(targetNode, 'range');
          if (
            item &&
            targetNode &&
            itemHasRange &&
            targetNodeHasRange &&
            (item as any).range &&
            (targetNode as any).range
          ) {
            return (
              (targetNode as any).range[0] >= (item as any).range[0] &&
              (targetNode as any).range[1] <= (item as any).range[2]
            );
          }

          return false;
        });

        if (seqIndex !== -1) {
          path.push(seqIndex);
        }
        // eslint-disable-next-line no-continue
        continue;
      }

      if (childNode) {
        // Find which index in the sequence this child corresponds to
        const seqIndex = ancestor.items.findIndex((item) => {
          // For debugging: let's be more thorough in our comparison
          if (item === childNode) return true;

          // Sometimes the nodes might not be exactly the same reference
          // but represent the same YAML node - let's check ranges if available
          const itemHasRange =
            typeof item === 'object' &&
            item !== null &&
            Object.prototype.hasOwnProperty.call(item, 'range');
          const childNodeHasRange =
            typeof childNode === 'object' &&
            childNode !== null &&
            Object.prototype.hasOwnProperty.call(childNode, 'range');
          if (
            item &&
            childNode &&
            itemHasRange &&
            childNodeHasRange &&
            (item as any).range &&
            (childNode as any).range
          ) {
            return (
              (item as any).range[0] === (childNode as any).range[0] &&
              (item as any).range[1] === (childNode as any).range[1]
            );
          }

          return false;
        });

        if (seqIndex !== -1) {
          path.push(seqIndex);
        }
      }
    }
  }

  return path;
}
