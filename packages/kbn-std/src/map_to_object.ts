/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export function mapToObject<V = unknown>(map: ReadonlyMap<string, V>) {
  const result: Record<string, V> = Object.create(null);
  for (const [key, value] of map) {
    result[key] = value;
  }
  return result;
}
