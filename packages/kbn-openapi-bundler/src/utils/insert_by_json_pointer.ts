/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Inserts `data` into the location specified by pointer in the `targetObject`.
 *
 * @param pointer [JSON Pointer](https://datatracker.ietf.org/doc/html/rfc6901)
 * @param component Component data to insert
 * @param componentsObject Components object to insert to
 */
export function insertRefByPointer(
  pointer: string,
  component: unknown,
  targetObject: Record<string, unknown>
): void {
  if (!pointer.startsWith('/')) {
    throw new Error(
      `insertRefByPointer expected a pointer starting with "/components" but got ${pointer}`
    );
  }

  // splitting '/components/some/path' by '/' gives ['', 'components',...]
  // where the first empty string should be skipped
  const segments = pointer.split('/').slice(1);
  let target = targetObject;

  while (segments.length > 0) {
    const segment = segments.shift() as string;

    if (!target[segment]) {
      target[segment] = {};
    }

    target = target[segment] as Record<string, unknown>;
  }

  Object.assign(target, component);
}
