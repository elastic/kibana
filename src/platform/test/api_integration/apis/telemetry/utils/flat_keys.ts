/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';

/**
 * Create a single-level array with strings for all the paths to values in the
 * source object, up to 3 deep. Going deeper than 3 causes a bit too much churn
 * in the tests.
 * @param source The object to extract the keys from.
 */
export function flatKeys(source: Record<string, unknown>) {
  const recursivelyFlatKeys = (obj: unknown, path: string[] = [], depth = 0): string[] => {
    return depth < 3 && _.isObject(obj) && _.size(obj) > 0
      ? Object.entries(obj).reduce(
          (acc, [k, v]) => [...acc, ...recursivelyFlatKeys(v, [...path, k], depth + 1)],
          [] as string[]
        )
      : [path.join('.')].filter(Boolean);
  };

  return _.uniq(_.flattenDeep(recursivelyFlatKeys(source))).sort((a, b) => a.localeCompare(b));
}
