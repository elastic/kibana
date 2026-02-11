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

export function getTriggerNodesWithType(yamlDocument: Document): YAMLMap[] {
  const triggerNodes: YAMLMap[] = [];

  if (!yamlDocument?.contents) return triggerNodes;

  visit(yamlDocument, {
    Pair(key, pair, ancestors) {
      if (!pair.key || !isScalar(pair.key) || pair.key.value !== 'type') {
        return;
      }

      // Check if this is a type field within a trigger
      const path = ancestors.slice();
      let isTriggerType = false;

      // Walk up the ancestors to see if we're in a triggers array
      for (let i = path.length - 1; i >= 0; i--) {
        const ancestor = path[i];
        if (isPair(ancestor) && isScalar(ancestor.key) && ancestor.key.value === 'triggers') {
          isTriggerType = true;
          break;
        }
      }

      if (isTriggerType && isScalar(pair.value)) {
        // Find the trigger node (parent containing the type)
        for (let i = path.length - 1; i >= 0; i--) {
          const ancestor = path[i];
          if (isMap(ancestor) && 'items' in ancestor && ancestor.items) {
            // Check if this map contains a type field
            const hasType = ancestor.items.some(
              (item) => isPair(item) && isScalar(item.key) && item.key.value === 'type'
            );
            if (hasType) {
              triggerNodes.push(ancestor);
              break;
            }
          }
        }
      }
    },
  });

  return triggerNodes;
}
