/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Cache } from 'cache-manager';

export async function fromCache<T>(
  key: string,
  store: Cache,
  cb: () => Promise<T>,
  cacheValidator?: (val: T) => boolean
): Promise<T> {
  let val = process.env.DISABLE_KBN_CLI_CACHE ? undefined : await store.get<T>(key);

  if (val !== undefined && cacheValidator) {
    val = cacheValidator(val) ? val : undefined;
  }

  if (val === undefined) {
    val = await cb();
  }

  store.set(key, val);
  return val;
}
