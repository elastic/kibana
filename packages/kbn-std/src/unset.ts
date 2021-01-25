/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { get } from './get';

/**
 * Unset a (potentially nested) key from given object.
 * This mutates the original object.
 *
 * @example
 * ```
 * unset(myObj, 'someRootProperty');
 * unset(myObj, 'some.nested.path');
 * ```
 */
export function unset<OBJ extends { [k: string]: any }>(obj: OBJ, atPath: string) {
  const paths = atPath
    .split('.')
    .map((s) => s.trim())
    .filter((v) => v !== '');
  if (paths.length === 0) {
    return;
  }
  if (paths.length === 1) {
    delete obj[paths[0]];
    return;
  }
  const property = paths.pop() as string;
  const parent = get(obj, paths as any) as any;
  if (parent !== undefined) {
    delete parent[property];
  }
}
