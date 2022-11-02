/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */

abstract class FileShareError extends Error {
  constructor(message: string) {
    super(message);
    Error.captureStackTrace(this);
  }
}

export class ExpiryDateInThePastError extends FileShareError {}
export class FileShareNotFoundError extends FileShareError {}
export class FileShareTokenInvalidError extends FileShareError {}
