/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceToken } from '@kbn/core-di';

/** Stable id for a `createToken()` symbol. The symbol itself is not sent across a worker. */
export function remoteTokenId(token: ServiceToken<unknown>): string {
  const id = Symbol.keyFor(token as symbol);
  if (!id) {
    throw new Error('Remote capability tokens must be created with createToken()');
  }
  return id;
}
