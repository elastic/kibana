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
 * Cache of scalar value nodes per Document. Uses WeakMap so entries are
 * garbage-collected when the Document is no longer referenced.
 * Nodes are sorted by range start for O(log n) offset lookups.
 */
const scalarValueCache = new WeakMap<Document, Scalar[]>();

function collectScalarValues(document: Document): Scalar[] {
  const cached = scalarValueCache.get(document);
  if (cached) {
    return cached;
  }

  const scalars: Scalar[] = [];

  if (!document.contents) {
    scalarValueCache.set(document, scalars);
    return scalars;
  }

  visit(document, {
    Scalar(_key, node, ancestors) {
      if (!node.range) {
        return;
      }
      const lastAncestor = ancestors?.[ancestors.length - 1];
      const isValue = isPair(lastAncestor) ? lastAncestor.value === node : lastAncestor != null;
      if (isValue) {
        scalars.push(node);
      }
    },
  });

  scalars.sort((a, b) => (a.range?.[0] ?? 0) - (b.range?.[0] ?? 0));
  scalarValueCache.set(document, scalars);
  return scalars;
}

/**
 * Gets the scalar value node at a specific position in the YAML document
 * Returns the node if found, null otherwise
 * This finds the scalar VALUE node (not the key) at the given position
 *
 * Caches all scalar value nodes per Document (via WeakMap) so that repeated
 * lookups for different offsets in the same document avoid re-traversing
 * the AST -- O(log n) binary search instead of O(n) per call.
 */
export function getScalarValueAtOffset(document: Document, offset: number): Scalar | null {
  const scalars = collectScalarValues(document);
  // Binary search for the scalar whose range contains the offset
  let lo = 0;
  let hi = scalars.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const node = scalars[mid];
    const { range } = node;
    if (!range) {
      break;
    }
    const [start, , end] = range;
    if (offset < start) {
      hi = mid - 1;
    } else if (offset > end) {
      lo = mid + 1;
    } else {
      return node;
    }
  }
  return null;
}
