/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
