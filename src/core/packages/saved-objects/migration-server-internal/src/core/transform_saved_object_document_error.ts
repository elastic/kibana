/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Error thrown when saved object migrations encounter a transformation error.
 * Transformation errors happen when a transform function throws an error for an unsanitized saved object
 */
export class TransformSavedObjectDocumentError extends Error {
  constructor(public readonly originalError: Error, public readonly version: string) {
    super(`Migration function for version ${version} threw an error`);
    appendCauseStack(this, originalError);
  }
}

const appendCauseStack = (error: Error, cause: Error) => {
  error.stack = (error.stack ?? '') + `\nCaused by:\n${cause.stack ?? cause.message}`;
};
