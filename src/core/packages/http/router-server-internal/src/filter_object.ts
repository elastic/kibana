/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { set } from '@kbn/safer-lodash-set';

/**
 * Somewhat safe way of picking a subset of keys...
 */
export function filterObject(o: object, paths: string[]): object {
  const result = {};
  for (const path of paths) {
    const keys = path.split('.');
    let current = o;
    const validPath = keys.every((key) => {
      if (Object.hasOwn(current, key)) {
        current = (current as { [k: string]: object })[key];
        return true;
      } else {
        return false;
      }
    });
    if (validPath) {
      set(result, path, current);
    }
  }
  return result;
}
