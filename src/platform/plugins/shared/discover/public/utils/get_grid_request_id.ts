/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const requestIds = new WeakMap<object, number>();
let nextRequestId = 1;

/**
 * Stable numeric id for a completed grid-result object identity.
 * The same array/object keeps the same id; a new result from refresh gets a new id.
 */
export const getGridRequestId = (result: object | undefined): number | undefined => {
  if (!result) {
    return undefined;
  }
  const existing = requestIds.get(result);
  if (existing !== undefined) {
    return existing;
  }
  const id = nextRequestId;
  nextRequestId += 1;
  requestIds.set(result, id);
  return id;
};
