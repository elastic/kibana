/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get, unset } from 'lodash';

/**
 * Unsets the path and checks if the parent property is an empty object.
 * If so, it removes the property from the config object (mutation is applied).
 *
 * @internal
 */
export const unsetAndCleanEmptyParent = (
  config: Record<string, unknown>,
  path: string | string[]
): void => {
  // 1. Unset the provided path
  const didUnset = unset(config, path);

  // Check if the unset actually removed anything.
  // This way we avoid some CPU cycles when the previous action didn't apply any changes.
  if (didUnset) {
    // 2. Check if the parent property in the resulting object is an empty object
    const pathArray = Array.isArray(path) ? path : path.split('.');
    const parentPath = pathArray.slice(0, -1);
    if (parentPath.length === 0) {
      return;
    }
    const parentObj = get(config, parentPath);
    if (
      typeof parentObj === 'object' &&
      parentObj !== null &&
      Object.keys(parentObj).length === 0
    ) {
      unsetAndCleanEmptyParent(config, parentPath);
    }
  }
};
