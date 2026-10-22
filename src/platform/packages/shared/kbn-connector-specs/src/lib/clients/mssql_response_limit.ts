/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Dependency-free so the spec can read the limit without importing the server-only client type.
const limits = new WeakMap<object, number>();

/** Records the Actions maximum response size (bytes) that applies to a pooled SQL client. */
export const setResponseLimit = (client: object, maxContentLength: number): void => {
  limits.set(client, maxContentLength);
};

export const getResponseLimit = (client: object): number | undefined => limits.get(client);
