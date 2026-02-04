/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, Pair, YAMLMap } from 'yaml';
import { isMap, isPair, isScalar, visit } from 'yaml';

/**
 * Finds the triggers pair in the YAML document, even if it's empty or has empty items
 * @returns The triggers pair if found, null otherwise
 */
export function getTriggersPair(yamlDocument: Document): Pair | null {
  if (!yamlDocument?.contents || !isMap(yamlDocument.contents)) {
    return null;
  }

  const contents = yamlDocument.contents;
  if (!('items' in contents) || !contents.items) {
    return null;
  }

  const triggersPair = contents.items.find(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'triggers'
  );

  return isPair(triggersPair) ? triggersPair : null;
}

/**
 * Finds all trigger nodes in the YAML document
 * @param yamlDocument The YAML document to search for trigger nodes
 * @returns An array of objects containing the trigger node, trigger type, and type pair
 */
export function getTriggerNodes(
  yamlDocument: Document
): Array<{ node: YAMLMap; triggerType: string; typePair: Pair }> {
  const triggerNodes: Array<{
    node: YAMLMap;
    triggerType: string;
    typePair: Pair;
  }> = [];

  if (!yamlDocument?.contents) {
    return triggerNodes;
  }

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
        const triggerType = pair.value.value as string;
        // Find the parent map node that contains this trigger
        const triggerMapNode = ancestors[ancestors.length - 1];
        if (isMap(triggerMapNode)) {
          triggerNodes.push({
            node: triggerMapNode,
            triggerType,
            typePair: pair, // Store the actual type pair for precise positioning
          });
        }
      }
    },
  });

  return triggerNodes;
}
