/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function generateDelta<TSource extends Record<string, any>>(
  source: TSource,
  changes: Partial<TSource>
): Partial<TSource> {
  return Object.entries(source).reduce((delta, [key, orig]) => {
    const changed = changes[key];
    if (orig != null && changed != null) {
      if (typeof orig === 'object' && typeof changed === 'object') {
        delta[key as keyof TSource] = generateDelta(orig, changed) as TSource[keyof TSource];
      } else if (orig !== changed) {
        delta[key as keyof TSource] = changed;
      }
    }
    return delta;
  }, {} as Partial<TSource>);
}
