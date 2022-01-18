/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

interface CliError extends Error {
  isCliError: boolean;
}

export function createCliError(message: string) {
  return Object.assign(new Error(message), {
    isCliError: true,
  });
}

function isObj(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export function isCliError(error: unknown): error is CliError {
  return isObj(error) && error.isCliError === true;
}
