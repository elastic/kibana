/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenApiDocument } from '../openapi_types';
import type { PlainObject } from './helpers/plain_object';
import { extractByJsonPointer } from './helpers/extract_by_json_pointer';
import { findLocalRefs } from './helpers/find_local_refs';
import { parseRef } from './helpers/parse_ref';

/**
 * Extracts circular references from a provided document.
 * Currently only local references are supported.
 */
export function getCircularRefs(document: OpenApiDocument): Set<string> {
  const localRefs = findLocalRefs(document);
  const circularRefs = new Set<string>();
  const resolveLocalRef = (localRef: string): PlainObject =>
    extractByJsonPointer(document, parseRef(localRef).pointer);

  // In general references represent a disconnected graph. To find
  // all references cycles we need to check each reference.
  for (const startRef of new Set(localRefs)) {
    const cycleHeadRef = findCycleHeadRef(startRef, resolveLocalRef);

    if (cycleHeadRef) {
      circularRefs.add(cycleHeadRef);
    }
  }

  return circularRefs;
}

/**
 * Searches for a cycle head. A search starts from `startRef` reference.
 *
 * A cycle head is a first ref in a cycle. If `startRef` inside a cycle
 * a cycle head is the starting ref. It can be illustrated as
 *
 *                        c1 - c2 - c3
 *                      /            |
 * r1 -> r2 -> r3 -> head            c4
 *                      \            |
 *                        c7 - c6 - c5
 *
 * On the schema above references `r1`, `r2` and `r3` depend on the cycle but
 * aren't part of the cycle. When search is started from them `head` is
 * returned. If a search starts from `c3` then `c3` will be returned.
 *
 * @param startRef A starting point to find a cycle
 * @param resolveRef A callback function to resolve an encountered reference.
 *                   It should return a document node the provided ref resolves to.
 * @returns a Set representing a cycle or an empty set if a cycle is not found
 */
function findCycleHeadRef(
  startRef: string,
  resolveRef: (ref: string) => PlainObject
): string | undefined {
  let result: string | undefined;

  const visitedRefs = new Set<string>();
  const search = (ref: string): void => {
    if (visitedRefs.has(ref)) {
      result = ref;
      return;
    }

    const refNode = resolveRef(ref);
    const nextRefs = findLocalRefs(refNode);

    visitedRefs.add(ref);
    nextRefs.forEach(search);
    visitedRefs.delete(ref);
  };

  search(startRef);

  return result;
}
