/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, Node, Pair, Scalar } from 'yaml';
import { isMap, isPair, isScalar, visit } from 'yaml';

/**
 * Detect if the current cursor position is inside a triggers block
 */
export function isInTriggersContext(path: (string | number)[]): boolean {
  // Check if the path includes 'triggers' at any level
  // Examples: ['triggers'], ['triggers', 0], ['triggers', 0, 'with'], etc.
  return path.length > 0 && path[0] === 'triggers';
}

/**
 * Detect if we're in a scheduled trigger's with block
 */
// TODO: replace it with triggersLookup or something like that
export function isInScheduledTriggerWithBlock(
  yamlDocument: Document,
  absolutePosition: number
): boolean {
  let result = false;

  visit(yamlDocument, {
    Map(key, node, ancestors) {
      if (!node.range) {
        return;
      }
      if (node.get('type') !== 'scheduled') {
        return;
      }

      // Check if we're inside this trigger's range
      if (absolutePosition < node.range[0] || absolutePosition > node.range[2]) {
        return;
      }

      // Find the 'with' property node within this trigger
      const withPair = node.items.find(
        (item) => isPair(item) && isScalar(item.key) && item.key.value === 'with'
      ) as Pair<Scalar, Node> | undefined;

      if (withPair?.value?.range) {
        // Check if the current position is within the with block's range
        if (
          absolutePosition >= withPair.value.range[0] &&
          absolutePosition <= withPair.value.range[2]
        ) {
          // Check if there's already an existing rrule or every configuration
          if (hasExistingScheduleConfiguration(withPair.value)) {
            // Don't show rrule suggestions if there's already a schedule configuration
            result = false;
            return visit.BREAK;
          }

          result = true;
          return visit.BREAK;
        }
      }
    },
  });

  return result;
}

/**
 * Check if there's already an existing schedule configuration (rrule or every) in the with block
 */
function hasExistingScheduleConfiguration(withNode: Node): boolean {
  if (!withNode || !isMap(withNode)) {
    return false;
  }

  // Check for existing 'rrule' or 'every' properties
  const items = withNode.items || [];

  for (const item of items) {
    if (isPair(item) && isScalar(item.key)) {
      const keyValue = item.key.value;
      if (keyValue === 'rrule' || keyValue === 'every') {
        return true;
      }
    }
  }

  return false;
}
