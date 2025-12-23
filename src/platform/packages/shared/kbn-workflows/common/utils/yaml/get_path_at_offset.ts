/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import { isNode, isScalar, visit } from 'yaml';
import { getPathFromAncestors } from './get_path_from_ancestors';

// Maximum distance from key end to consider position as typing the value
// This prevents matching pairs when cursor is on a new line far from the key
const MAX_PAIR_DISTANCE = 50;

export function getPathAtOffset(
  document: Document,
  absolutePosition: number
): Array<string | number> {
  let path: Array<string | number> | null = null;
  let bestMapRange: number | null = null;
  let bestMapPath: Array<string | number> | null = null;
  let bestPairDistance: number | null = null;
  let bestPairPath: Array<string | number> | null = null;

  if (!document.contents) {
    return [];
  }

  visit(document, {
    Scalar(key, node, ancestors) {
      if (!node.range) {
        return;
      }
      if (absolutePosition >= node.range[0] && absolutePosition <= node.range[2]) {
        // Skip empty scalars in incomplete YAML
        if (node.value === '') {
          return;
        }
        path = getPathFromAncestors(ancestors, node);
        return visit.BREAK;
      }
    },
    Pair(key, pair, ancestors) {
      if (!isScalar(pair.key) || !pair.key.range) {
        return;
      }
      const keyEnd = pair.key.range[2];
      const valueNode = isNode(pair.value) ? pair.value : null;
      const hasValue = valueNode && valueNode.range;

      // Check if position is after the key (typing the value)
      if (absolutePosition >= keyEnd) {
        const distance = absolutePosition - keyEnd;
        // Check if position is in the value area: before value start, within value, or close to key for incomplete pairs
        // Since range[0] <= range[2], checking <= range[2] covers both before and within value cases
        const isInValueArea = hasValue
          ? valueNode.range && absolutePosition <= valueNode.range[2]
          : distance <= MAX_PAIR_DISTANCE; // For incomplete pairs, only match if close to key

        if (isInValueArea) {
          // Build path from ancestors and add this pair's key
          const pairPath = getPathFromAncestors(ancestors, valueNode ?? undefined);
          const keyValue = pair.key.value as string;
          // Add the key if it's not already the last element in the path
          if (!pairPath.length || pairPath[pairPath.length - 1] !== keyValue) {
            pairPath.push(keyValue);
          }

          // Track the Pair with the smallest distance from key end (closest key)
          if (bestPairDistance === null || distance < bestPairDistance) {
            bestPairDistance = distance;
            bestPairPath = pairPath;
          }
        }
      }
    },
    Map(key, node, ancestors) {
      if (!node.range) {
        return;
      }
      // For Map nodes, track the most specific one containing the position
      // (smallest range that still contains the position)
      if (absolutePosition >= node.range[0] && absolutePosition <= node.range[2]) {
        const mapRange = node.range[2] - node.range[0];
        if (bestMapRange === null || mapRange < bestMapRange) {
          bestMapRange = mapRange;
          bestMapPath = getPathFromAncestors(ancestors, node);
        }
      }
    },
  });

  if (bestPairPath !== null) {
    return bestPairPath;
  }
  if (bestMapPath !== null) {
    return bestMapPath;
  }
  return path ?? [];
}
