/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function lazyObject<T extends Record<string, any>>(obj: T): T {
  // At runtime (without Babel), this is a no-op identity.
  // The Babel plugin will rewrite calls to lazyObject({ ... }) into
  // createLazyObjectFromFactories({ key: () => expr, ... }).
  return obj;
}
