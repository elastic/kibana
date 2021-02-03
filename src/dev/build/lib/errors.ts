/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const loggedErrors = new WeakSet<any>();

export function markErrorLogged<T = any>(error: T): T {
  loggedErrors.add(error);
  return error;
}

export function isErrorLogged(error: any) {
  return loggedErrors.has(error);
}
