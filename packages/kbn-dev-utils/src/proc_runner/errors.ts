/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const $isCliError = Symbol('isCliError');

interface CliError extends Error {
  [$isCliError]: boolean;
}

export function createCliError(message: string) {
  const error: Partial<CliError> = new Error(message);
  error[$isCliError] = true;
  return error as CliError;
}

export function isCliError(error: any): error is CliError {
  return error && !!error[$isCliError];
}
