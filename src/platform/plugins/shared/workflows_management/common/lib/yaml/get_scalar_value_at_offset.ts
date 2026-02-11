/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document, Scalar } from 'yaml';
import { isPair, visit } from 'yaml';

/**
 * Gets the scalar value node at a specific position in the YAML document
 * Returns the node if found, null otherwise
 * This finds the scalar VALUE node (not the key) at the given position
 */
export function getScalarValueAtOffset(document: Document, offset: number): Scalar | null {
  let scalarNode: Scalar | null = null;

  if (!document.contents) {
    return null;
  }

  visit(document, {
    Scalar(key, node, ancestors) {
      if (!node.range) {
        return;
      }
      if (offset >= node.range[0] && offset <= node.range[2]) {
        // Check if this is a value (not a key)
        // The value will be the value of a Pair
        const lastAncestor = ancestors?.[ancestors.length - 1];
        if (isPair(lastAncestor) && lastAncestor.value === node) {
          scalarNode = node;
          return visit.BREAK;
        }
        // Also handle cases where the scalar might be a top-level value or in a sequence
        // If it's not a key, treat it as a value
        if (lastAncestor && !isPair(lastAncestor)) {
          // This is a top-level value or sequence item
          scalarNode = node;
          return visit.BREAK;
        }
      }
    },
  });

  return scalarNode;
}
