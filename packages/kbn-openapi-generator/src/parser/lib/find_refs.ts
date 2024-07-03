/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { hasRef } from './helpers/has_ref';
import { traverseObject } from './helpers/traverse_object';

/**
 * Traverse the OpenAPI document recursively and find all references
 *
 * @param obj Any object
 * @returns A list of external references
 */
export function findRefs(obj: unknown): string[] {
  const refs: string[] = [];

  traverseObject(obj, (element) => {
    if (hasRef(element)) {
      refs.push(element.$ref);
    }
  });

  return refs;
}
