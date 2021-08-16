/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

class CliError extends Error {
  public readonly isCliError = true;

  constructor(message?: string) {
    super(message);
  }
}

export const createCliError = function (message: string) {
  return new CliError(message);
};

export const isCliError = function (error: Error): error is CliError {
  return error && (error as CliError).isCliError;
};
