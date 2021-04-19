/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isPlainObject } from 'lodash';

export function setHeaders(originalHeaders: object, newHeaders: object) {
  if (!isPlainObject(originalHeaders)) {
    throw new Error(
      `Expected originalHeaders to be an object, but ${typeof originalHeaders} given`
    );
  }
  if (!isPlainObject(newHeaders)) {
    throw new Error(`Expected newHeaders to be an object, but ${typeof newHeaders} given`);
  }

  return {
    ...originalHeaders,
    ...newHeaders,
  };
}
