/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';

/**
 * Synchronously reads and parses a JSON file at the given path.
 *
 * @param path Absolute path to the JSON file.
 */
export function loadJsonFile<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

/**
 * Given a JS object, will return a JSON.stringified result with consistently
 * sorted keys.
 */
export function prettyPrintAndSortKeys(object: object): string {
  const keys = new Set<string>();
  JSON.stringify(object, (key, value) => {
    keys.add(key);
    return value;
  });
  return JSON.stringify(object, Array.from(keys).sort(), 2);
}
