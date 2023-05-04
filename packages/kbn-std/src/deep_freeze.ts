/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RecursiveReadonly } from '@kbn/utility-types';

/** @public */
export type Freezable = { [k: string]: any } | any[];

/**
 * Apply Object.freeze to a value recursively and convert the return type to
 * Readonly variant recursively
 *
 * @public
 */
export function deepFreeze<T extends Freezable>(object: T) {
  // for any properties that reference an object, makes sure that object is
  // recursively frozen as well
  for (const value of Object.values(object)) {
    if (value !== null && typeof value === 'object') {
      deepFreeze(value);
    }
  }
  return Object.freeze(object) as RecursiveReadonly<T>;
}
