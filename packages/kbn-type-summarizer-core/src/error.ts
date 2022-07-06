/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Convert an unknown thrown value to an Error instance if it isn't alread
 */
export function toError(thrown: unknown) {
  if (thrown instanceof Error) {
    return thrown;
  }

  return new Error(`${thrown} thrown`);
}

/**
 * Is this error instance a Node.js system error which has an error code attached?
 */
export function isSystemError(error: Error): error is NodeJS.ErrnoException {
  return typeof (error as any).code === 'string';
}
