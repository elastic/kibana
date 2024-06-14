/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OpenApiDocument } from '../openapi_types';
import type { PlainObject } from './helpers/plain_object';
import { extractByJsonPointer } from './helpers/extract_by_json_pointer';
import { findRefs } from './find_refs';

/**
 * Extracts circular references from a provided document.
 * Currently only local references are supported.
 */
export function getCircularRefs(document: OpenApiDocument): Set<string> {
  const localRefs = findLocalRefs(document);
  const circularRefs = new Set<string>();
  const resolveLocalRef = (localRef: string): PlainObject =>
    extractByJsonPointer(document, extractJsonPointer(localRef));

  // In general references represent a disconnected graph. To find
  // all references cycles we need to check each reference.
  for (const startRef of new Set(localRefs)) {
    if (circularRefs.has(startRef)) {
      // We already found a cycle with the current startRef
      // continue to the next one
      continue;
    }

    for (const circularRef of findCycle(startRef, resolveLocalRef)) {
      circularRefs.add(circularRef);
    }
  }

  return circularRefs;
}

/**
 * Searches for a reference cycle starting from `startRef` reference.
 *
 * @param startRef A starting point to find a cycle
 * @param resolveRef A callback function to resolve an encountered reference.
 *                   It should return a document node the provided ref resolves to.
 * @returns a Set representing a cycle or an empty set if a cycle is not found
 */
function findCycle(startRef: string, resolveRef: (ref: string) => PlainObject): Set<string> {
  let result = new Set<string>();

  const visitedRefs = new Set<string>();
  const search = (ref: string): void => {
    if (visitedRefs.has(ref)) {
      // Need to make a copy due to deletion of the current ref
      // in the recursion chain via `visitedRefs.delete(ref);`
      result = new Set(visitedRefs);
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

/**
 * Finds local references
 */
function findLocalRefs(obj: unknown): string[] {
  return findRefs(obj).filter((ref) => isLocalRef(ref));
}

/**
 * Checks whether the provided ref is local.
 * Local references start with `#/`
 */
function isLocalRef(ref: string): boolean {
  return ref.startsWith('#/');
}

/**
 * Extracts a JSON Pointer from a local reference
 * by getting rid of the leading slash
 */
function extractJsonPointer(ref: string): string {
  return ref.substring(1);
}
