/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Takes an object with a `type` and `id` field and returns a key string.
 *
 * @internal
 */
export function getObjectKey({ type, id }: { type: string; id: string }) {
  return `${type}:${id}`;
}

/**
 * Parses a 'type:id' key string and returns an object with a `type` field and an `id` field.
 *
 * @internal
 */
export function parseObjectKey(key: string) {
  const type = key.slice(0, key.indexOf(':'));
  const id = key.slice(type.length + 1);
  if (!type || !id) {
    throw new Error('Malformed object key (should be "type:id")');
  }
  return { type, id };
}
