/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SchemaError, SchemaTypeError, SchemaTypesError, ValidationError } from '../errors';

/** Prefix object property key onto validation error paths (for nested object keys). */
export function prependPropertyKey(key: string, err: SchemaTypeError): SchemaTypeError {
  if (err instanceof SchemaTypesError) {
    return new SchemaTypesError(
      err.message,
      [key, ...err.path],
      err.errors.map((e) => prependPropertyKey(key, e))
    );
  }
  return new SchemaTypeError(err.message, [key, ...err.path]);
}

/**
 * Prefix a union branch index or array index onto paths without rewriting nested aggregate errors.
 * Used so `[1]: … - [0]:` stays grouped instead of becoming `[1.0]:` when wrapping SchemaTypesError.
 */
export function prependPathSegment(segment: string, err: SchemaTypeError): SchemaTypeError {
  if (err instanceof SchemaTypesError) {
    return new SchemaTypesError(err.message, [segment, ...err.path], err.errors);
  }
  return new SchemaTypeError(err.message, [segment, ...err.path]);
}

export function unwrapValidationError(error: unknown): SchemaTypeError | undefined {
  if (error instanceof ValidationError && error.cause instanceof SchemaTypeError) {
    return error.cause;
  }
  if (error instanceof SchemaError && error.cause instanceof SchemaTypeError) {
    return error.cause;
  }
  return undefined;
}
