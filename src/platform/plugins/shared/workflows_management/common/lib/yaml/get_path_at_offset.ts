/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Document } from 'yaml';
import { visit } from 'yaml';
import { getPathFromAncestors } from './get_path_from_ancestors';

export function getPathAtOffset(
  document: Document,
  absolutePosition: number
): Array<string | number> {
  let path: Array<string | number> = [];
  let deepestLevel = -1;

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
    Map(key, node, ancestors) {
      if (!node.range) {
        return;
      }
      // For Map nodes, we track the deepest one containing the position
      // This handles incomplete YAML where there might not be a scalar at the position
      if (absolutePosition >= node.range[0] && absolutePosition <= node.range[2]) {
        if (ancestors.length > deepestLevel) {
          deepestLevel = ancestors.length;
          path = getPathFromAncestors(ancestors, node);
        }
      }
    },
  });

  return path;
}
