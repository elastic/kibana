/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, YAMLMap } from 'yaml';
import { isMap, isPair, isScalar, visit } from 'yaml';

export function isStepLikeMap(item: unknown): item is YAMLMap {
  if (!item || !isMap(item)) return false;
  const items = (item as YAMLMap).items;
  if (!items) return false;
  const hasName = items.some((p) => isPair(p) && isScalar(p.key) && p.key.value === 'name');
  const hasType = items.some((p) => isPair(p) && isScalar(p.key) && p.key.value === 'type');
  return hasName && hasType;
}

export function getStepNodesWithType(yamlDocument: Document): YAMLMap[] {
  const stepNodes: YAMLMap[] = [];

  if (!yamlDocument?.contents) {
    return stepNodes;
  }

  visit(yamlDocument, {
    Pair(key, pair, ancestors) {
      if (!pair.key || !isScalar(pair.key) || pair.key.value !== 'type') {
        return;
      }

      // Check if this is a type field within a step (not nested inside 'with' or other blocks)
      const path = ancestors.slice();
      let isMainStepType = false;

      // Walk up the ancestors to see if we're in a steps array
      // and ensure this type field is a direct child of a step, not nested in 'with'
      for (let i = path.length - 1; i >= 0; i--) {
        const ancestor = path[i];

        // If we encounter a 'with' field before finding 'steps', this is a nested type
        if (isPair(ancestor) && isScalar(ancestor.key) && ancestor.key.value === 'with') {
          return; // Skip this type field - it's inside a 'with' block
        }

        // If we find 'steps', this could be a main step type
        if (isPair(ancestor) && isScalar(ancestor.key) && ancestor.key.value === 'steps') {
          isMainStepType = true;
          break;
        }
      }

      if (isMainStepType && isScalar(pair.value)) {
        // Find the step node (parent containing the type) - should be the immediate parent map
        const immediateParent = ancestors[ancestors.length - 1];
        if (isMap(immediateParent) && 'items' in immediateParent && immediateParent.items) {
          // Ensure this is a step node by checking it has both 'name' and 'type' fields
          const hasName = immediateParent.items.some(
            (item) => isPair(item) && isScalar(item.key) && item.key.value === 'name'
          );
          const hasType = immediateParent.items.some(
            (item) => isPair(item) && isScalar(item.key) && item.key.value === 'type'
          );

          if (hasName && hasType) {
            stepNodes.push(immediateParent);
          }
        }
      }
    },
  });

  return stepNodes;
}
