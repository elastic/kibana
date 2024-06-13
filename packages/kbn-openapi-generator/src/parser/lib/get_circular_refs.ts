/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenApiDocument } from '../openapi_types';
import { extractByJsonPointer } from './helpers/extract_by_json_pointer';
import { findRefs } from './find_refs';
import { hasRef } from './helpers/has_ref';
import { traverseObject } from './helpers/traverse_object';

/**
 * Extracts circular references from a provided document.
 * Currently only local references are supported.
 */
export function getCircularRefs(document: OpenApiDocument): Set<string> {
  // Process only local references
  // Local references start with `#/`
  const refs = findRefs(document).filter((ref) => ref.startsWith('#/'));
  const circularRefs = new Set<string>();

  // We need to start traversal from each reference to make sure we caught
  // all circular cycles. Use BFS algorithm on top of traverseObject function.
  for (const ref of new Set(refs)) {
    const refsToVisit = [[ref, new Set<string>()] as const];

    while (refsToVisit.length > 0) {
      for (let i = refsToVisit.length - 1; i >= 0; --i) {
        const [currentRef, visitedRefsSet] = refsToVisit.shift()!;
        const currentRefNode = extractByJsonPointer(document, extractJsonPointer(currentRef));

        visitedRefsSet.add(currentRef);

        traverseObject(currentRefNode, (node) => {
          // Only local references are supported
          // Local references start with `#/`
          if (!hasRef(node) || !node.$ref.startsWith('#/')) {
            return;
          }

          if (visitedRefsSet.has(node.$ref)) {
            circularRefs.add(node.$ref);
            return;
          }

          refsToVisit.push([node.$ref, new Set(visitedRefsSet)]);
        });
      }
    }
  }

  return circularRefs;
}

/**
 * Extracts a JSON Pointer from a local reference
 * by getting rid of the leading slash
 */
function extractJsonPointer(ref: string): string {
  return ref.substring(1);
}
