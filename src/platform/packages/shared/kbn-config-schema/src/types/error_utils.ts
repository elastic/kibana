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

export interface PrependPathSegmentOptions {
  /**
   * When prepending an **array index**, also prefix each child of a {@link SchemaTypesError}
   * so leaf paths include the index (Joi parity for e.g. `[arr.0.field]`).
   * When prepending a **union branch index**, leave aggregate children unchanged so nested
   * `types that failed validation` bullets stay branch-relative (`[1]` then `- [0]:`).
   */
  recurseIntoAggregateChildren?: boolean;
}

/**
 * Prefix a union branch index or array index onto paths. For {@link SchemaTypesError},
 * see {@link PrependPathSegmentOptions.recurseIntoAggregateChildren}.
 */
export function prependPathSegment(
  segment: string,
  err: SchemaTypeError,
  options?: PrependPathSegmentOptions
): SchemaTypeError {
  const recurse = options?.recurseIntoAggregateChildren === true;
  if (err instanceof SchemaTypesError) {
    if (recurse) {
      return new SchemaTypesError(
        err.message,
        [segment, ...err.path],
        err.errors.map((e) => prependPathSegment(segment, e, options))
      );
    }
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
