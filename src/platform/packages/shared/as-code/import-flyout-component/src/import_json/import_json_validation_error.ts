/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const IMPORT_JSON_VALIDATION_ERROR_NAME = 'ImportJsonValidationError';

/**
 * Thrown by `sanitizeImportJson` when the input can be fixed by the user. Its message is shown
 * next to the JSON input instead of the generic server error callout.
 */
export class ImportJsonValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = IMPORT_JSON_VALIDATION_ERROR_NAME;
  }
}

/** Matches by name so the check also works when the error comes from another bundle. */
export const isImportJsonValidationError = (error: unknown): error is ImportJsonValidationError =>
  error instanceof Error && error.name === IMPORT_JSON_VALIDATION_ERROR_NAME;
