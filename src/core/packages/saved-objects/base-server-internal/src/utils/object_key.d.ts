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
export declare function getObjectKey({ type, id }: { type: string; id: string }): string;
/**
 * Parses a 'type:id' key string and returns an object with a `type` field and an `id` field.
 *
 * @internal
 */
export declare function parseObjectKey(key: string): {
  type: string;
  id: string;
};
